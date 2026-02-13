import { Layout } from "@/components/layout";
import { useInterviews, useDeleteInterview } from "@/hooks/use-interviews";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Mic,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  Trash2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { Interview } from "@/types";
import { useToast } from "@/hooks/use-toast";

function getStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="size-4 text-green-500" />;
    case "in_progress":
      return <Play className="size-4 text-blue-500" />;
    case "cancelled":
      return <XCircle className="size-4 text-red-500" />;
    default:
      return <Clock className="size-4 text-yellow-500" />;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "completed":
      return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
    case "in_progress":
      return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
    case "cancelled":
      return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
    default:
      return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
  }
}

function getRecommendationColor(rec?: string) {
  switch (rec) {
    case "hire":
      return "text-green-600 dark:text-green-400";
    case "pass":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-yellow-600 dark:text-yellow-400";
  }
}

export default function InterviewsPage() {
  const { data: interviews, isLoading } = useInterviews();
  const deleteInterview = useDeleteInterview();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    if (!confirm("Delete this interview?")) return;
    deleteInterview.mutate(id, {
      onSuccess: () => toast({ title: "Interview deleted" }),
    });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">AI Voice Interviews</h1>
          <p className="text-muted-foreground mt-1">
            Manage and review AI-powered voice interviews for your candidates.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !interviews || interviews.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
            <Mic className="size-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">No Interviews Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Start an AI voice interview from any job's candidate list. The AI will conduct the
              interview and provide evaluation scores.
            </p>
            <Link href="/jobs">
              <Button className="rounded-full">Go to Jobs</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {interviews.map((interview, i) => (
              <motion.div
                key={interview.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="bg-card border border-border/50 rounded-2xl p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Mic className="size-5 text-primary" />
                      <span className="font-bold font-display">
                        Interview #{interview.id}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          interview.status
                        )}`}
                      >
                        {getStatusIcon(interview.status)}
                        {interview.status}
                      </span>
                    </div>

                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Session: <code className="text-xs">{interview.sessionId}</code></p>
                      <p>Voice: {interview.voice || "NATF2"}</p>
                      {interview.createdAt && (
                        <p>Created: {new Date(interview.createdAt).toLocaleString()}</p>
                      )}
                      {interview.completedAt && (
                        <p>Completed: {new Date(interview.completedAt).toLocaleString()}</p>
                      )}
                    </div>

                    {/* Evaluation Summary */}
                    {interview.evaluation && interview.status === "completed" && (
                      <div className="mt-4 p-4 bg-muted/50 rounded-xl border border-border/50">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                              {interview.overallScore ?? interview.evaluation.overall_score ?? "N/A"}
                            </div>
                            <div className="text-xs text-muted-foreground">Overall</div>
                          </div>
                          {interview.evaluation.communication_score != null && (
                            <div className="text-center">
                              <div className="text-lg font-bold">{interview.evaluation.communication_score}</div>
                              <div className="text-xs text-muted-foreground">Comm.</div>
                            </div>
                          )}
                          {interview.evaluation.technical_score != null && (
                            <div className="text-center">
                              <div className="text-lg font-bold">{interview.evaluation.technical_score}</div>
                              <div className="text-xs text-muted-foreground">Technical</div>
                            </div>
                          )}
                          {interview.evaluation.enthusiasm_score != null && (
                            <div className="text-center">
                              <div className="text-lg font-bold">{interview.evaluation.enthusiasm_score}</div>
                              <div className="text-xs text-muted-foreground">Enthusiasm</div>
                            </div>
                          )}
                          {interview.evaluation.recommendation && (
                            <div className="ml-auto text-right">
                              <div className={`text-lg font-bold capitalize ${getRecommendationColor(interview.evaluation.recommendation)}`}>
                                {interview.evaluation.recommendation}
                              </div>
                              <div className="text-xs text-muted-foreground">Recommendation</div>
                            </div>
                          )}
                        </div>
                        {interview.evaluation.summary && (
                          <p className="text-sm text-muted-foreground">{interview.evaluation.summary}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(interview.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
