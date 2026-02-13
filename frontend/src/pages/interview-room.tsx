import { useState, useRef, useCallback, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Send,
  Square,
  Volume2,
} from "lucide-react";
import type { Interview } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function InterviewRoomPage() {
  const [, params] = useRoute("/my-interviews/:id");
  const [, setLocation] = useLocation();
  const interviewId = params?.id ? Number(params.id) : undefined;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [conversation, setConversation] = useState<
    Array<{ role: "candidate" | "interviewer"; text: string; audioUrl?: string }>
  >([]);
  const [candidateText, setCandidateText] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: interview, isLoading } = useQuery<Interview>({
    queryKey: ["/api/my-interviews", interviewId],
    queryFn: async () => {
      const res = await apiFetch(`/api/my-interviews/${interviewId}`);
      if (!res.ok) throw new Error("Failed to fetch interview");
      return res.json();
    },
    enabled: !!interviewId,
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  // Load existing conversation if interview is in_progress or completed
  useEffect(() => {
    if (interview?.conversation && interview.conversation.length > 0) {
      setConversation(
        interview.conversation.map((c: any) => ({
          role: c.role === "interviewer" ? "interviewer" : "candidate",
          text: c.text,
        }))
      );
    }
  }, [interview?.conversation]);

  const respondMutation = useMutation({
    mutationFn: async (data: { audio_url?: string; candidate_text: string }) => {
      const res = await apiFetch(`/api/my-interviews/${interviewId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to send response");
      }
      return res.json();
    },
    onSuccess: (result) => {
      if (result.interviewer_text) {
        setConversation((prev) => [
          ...prev,
          {
            role: "interviewer",
            text: result.interviewer_text,
            audioUrl: result.interviewer_audio_url,
          },
        ]);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/my-interviews", interviewId] });
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const evaluateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/my-interviews/${interviewId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to evaluate");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Interview completed", description: "Your interview has been evaluated." });
      queryClient.invalidateQueries({ queryKey: ["/api/my-interviews"] });
      setLocation("/my-interviews");
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      setIsEvaluating(false);
    },
  });

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });

        // Convert to data URL for sending (in production, upload to cloud storage)
        const reader = new FileReader();
        reader.onload = () => {
          const audioUrl = reader.result as string;
          setIsProcessing(true);

          // Add candidate message to conversation
          const text = candidateText.trim() || "(audio response)";
          setConversation((prev) => [
            ...prev,
            { role: "candidate", text },
          ]);
          setCandidateText("");

          respondMutation.mutate(
            { audio_url: audioUrl, candidate_text: text },
            { onSettled: () => setIsProcessing(false) }
          );
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to start the interview.",
        variant: "destructive",
      });
    }
  }, [candidateText, respondMutation, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Text-only response (fallback if mic not available)
  const sendTextResponse = useCallback(() => {
    const text = candidateText.trim();
    if (!text) return;

    setConversation((prev) => [...prev, { role: "candidate", text }]);
    setCandidateText("");
    setIsProcessing(true);

    respondMutation.mutate(
      { audio_url: "", candidate_text: text },
      { onSettled: () => setIsProcessing(false) }
    );
  }, [candidateText, respondMutation]);

  const finishInterview = useCallback(() => {
    if (conversation.length < 2) {
      toast({
        title: "Not enough conversation",
        description: "Please have at least one exchange before finishing.",
        variant: "destructive",
      });
      return;
    }
    setIsEvaluating(true);
    evaluateMutation.mutate();
  }, [conversation.length, evaluateMutation, toast]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!interview) {
    return (
      <Layout>
        <div className="text-center py-20">
          <AlertCircle className="size-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Interview not found</h3>
          <Button onClick={() => setLocation("/my-interviews")} className="rounded-full mt-4">
            <ArrowLeft className="size-4 mr-2" />
            Back to Interviews
          </Button>
        </div>
      </Layout>
    );
  }

  const isCompleted = interview.status === "completed";
  const isCancelled = interview.status === "cancelled";
  const canRespond = !isCompleted && !isCancelled && !isProcessing && !isEvaluating;

  return (
    <Layout>
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/my-interviews")}
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold">AI Interview</h1>
              <p className="text-sm text-muted-foreground">
                Session #{interview.id} &middot; Voice: {interview.voice || "NATF2"}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={
              isCompleted
                ? "bg-green-100 text-green-700 border-green-200"
                : isCancelled
                ? "bg-red-100 text-red-700 border-red-200"
                : "bg-blue-100 text-blue-700 border-blue-200"
            }
          >
            {isCompleted ? "Completed" : isCancelled ? "Cancelled" : interview.status === "in_progress" ? "In Progress" : "Ready"}
          </Badge>
        </div>

        {/* Instructions for new interviews */}
        {interview.status === "pending" && conversation.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center"
          >
            <Mic className="size-10 text-primary mx-auto mb-3" />
            <h3 className="font-bold font-display text-lg mb-2">Ready to begin your interview</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-1">
              Click the microphone button to record your response, or type your answer below.
              The AI interviewer will ask you questions and evaluate your responses.
            </p>
            <p className="text-xs text-muted-foreground">
              Tip: Speak clearly and take your time. You can end the interview when ready.
            </p>
          </motion.div>
        )}

        {/* Conversation */}
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-muted/30">
            <h3 className="font-bold font-display text-sm">Conversation</h3>
          </div>

          <div className="p-4 space-y-4 min-h-[300px] max-h-[500px] overflow-y-auto">
            {conversation.length === 0 && !isProcessing && (
              <p className="text-center text-muted-foreground text-sm py-8">
                {isCompleted
                  ? "No conversation recorded."
                  : "Send your first message to start the interview."}
              </p>
            )}

            {conversation.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${
                  msg.role === "candidate" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "candidate"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  }`}
                >
                  <p className="text-xs font-bold mb-1 opacity-70">
                    {msg.role === "candidate" ? "You" : "AI Interviewer"}
                  </p>
                  <p>{msg.text}</p>
                  {msg.audioUrl && (
                    <button
                      onClick={() => {
                        const audio = new Audio(msg.audioUrl);
                        audio.play();
                      }}
                      className="mt-2 flex items-center gap-1 text-xs opacity-80 hover:opacity-100"
                    >
                      <Volume2 className="size-3" />
                      Play audio
                    </button>
                  )}
                </div>
              </motion.div>
            ))}

            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    AI is thinking...
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          {canRespond && (
            <div className="p-4 border-t border-border/50 bg-muted/20">
              <div className="flex items-center gap-3">
                {/* Mic button */}
                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  size="icon"
                  className="rounded-full shrink-0 size-12"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                >
                  {isRecording ? (
                    <Square className="size-5" />
                  ) : (
                    <Mic className="size-5" />
                  )}
                </Button>

                {/* Text input */}
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={
                      isRecording
                        ? "Recording... (optional text note)"
                        : "Type your response..."
                    }
                    value={candidateText}
                    onChange={(e) => setCandidateText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isRecording) sendTextResponse();
                    }}
                    className="flex-1 bg-background border border-border rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    disabled={isProcessing}
                  />
                  {!isRecording && (
                    <Button
                      variant="default"
                      size="icon"
                      className="rounded-full shrink-0"
                      onClick={sendTextResponse}
                      disabled={!candidateText.trim() || isProcessing}
                    >
                      <Send className="size-4" />
                    </Button>
                  )}
                </div>
              </div>

              {isRecording && (
                <div className="flex items-center gap-2 mt-3 text-sm text-destructive">
                  <div className="size-2 bg-destructive rounded-full animate-pulse" />
                  Recording... Click the stop button when done.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => setLocation("/my-interviews")}
          >
            <ArrowLeft className="size-4 mr-2" />
            Back
          </Button>

          {canRespond && conversation.length >= 2 && (
            <Button
              onClick={finishInterview}
              className="rounded-full"
              disabled={isEvaluating}
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4 mr-2" />
                  Finish Interview
                </>
              )}
            </Button>
          )}
        </div>

        {/* Evaluation results (if completed) */}
        {isCompleted && interview.evaluation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/50 rounded-2xl p-6"
          >
            <h3 className="font-bold font-display text-lg mb-4">Evaluation Results</h3>
            <div className="flex flex-wrap gap-6 mb-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {interview.overallScore ?? interview.evaluation.overall_score ?? "N/A"}
                </div>
                <div className="text-xs text-muted-foreground">Overall</div>
              </div>
              {interview.evaluation.communication_score != null && (
                <div className="text-center">
                  <div className="text-xl font-bold">{interview.evaluation.communication_score}</div>
                  <div className="text-xs text-muted-foreground">Communication</div>
                </div>
              )}
              {interview.evaluation.technical_score != null && (
                <div className="text-center">
                  <div className="text-xl font-bold">{interview.evaluation.technical_score}</div>
                  <div className="text-xs text-muted-foreground">Technical</div>
                </div>
              )}
              {interview.evaluation.enthusiasm_score != null && (
                <div className="text-center">
                  <div className="text-xl font-bold">{interview.evaluation.enthusiasm_score}</div>
                  <div className="text-xs text-muted-foreground">Enthusiasm</div>
                </div>
              )}
              {interview.evaluation.recommendation && (
                <div className="text-center ml-auto">
                  <div
                    className={`text-xl font-bold capitalize ${
                      interview.evaluation.recommendation === "hire"
                        ? "text-green-600"
                        : interview.evaluation.recommendation === "pass"
                        ? "text-red-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {interview.evaluation.recommendation}
                  </div>
                  <div className="text-xs text-muted-foreground">Recommendation</div>
                </div>
              )}
            </div>
            {interview.evaluation.summary && (
              <p className="text-sm text-muted-foreground">{interview.evaluation.summary}</p>
            )}
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
