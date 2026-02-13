import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Upload, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Job } from "@/types";

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function JobApplyPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const { data: job, isLoading: jobLoading } = useQuery<Job>({
    queryKey: ["/api/board/jobs", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/board/jobs/${id}`);
      if (!res.ok) throw new Error("Job not found");
      return res.json();
    },
  });

  const [formData, setFormData] = useState({
    applicantName: "",
    applicantEmail: "",
    coverLetter: "",
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const applyMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("applicantName", formData.applicantName);
      form.append("applicantEmail", formData.applicantEmail);
      if (formData.coverLetter) {
        form.append("coverLetter", formData.coverLetter);
      }
      if (resumeFile) {
        form.append("resumeFile", resumeFile);
      }

      const res = await fetch(`${API_BASE}/api/board/jobs/${id}/apply`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit application");
      }

      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Application Submitted",
        description: "Your application has been sent successfully!",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (jobLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold">Job Not Found</h2>
        <p className="text-muted-foreground">This job may no longer be accepting applications.</p>
        <Link href="/board">
          <Button>Browse All Jobs</Button>
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <CheckCircle2 className="size-20 text-green-500" />
        </motion.div>
        <h2 className="text-3xl font-display font-bold text-center">Application Submitted!</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Thank you for applying to <strong>{job.title}</strong>. The hiring team will review your
          application and get back to you.
        </p>
        <Link href="/board">
          <Button variant="outline" className="rounded-full">
            Browse More Jobs
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Header */}
      <header className="px-6 h-20 flex items-center justify-between max-w-7xl mx-auto w-full">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm font-display">VH</span>
            </div>
            <span className="font-display font-bold text-xl tracking-tight">VibeHiring</span>
          </div>
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link href="/board">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="size-4 mr-2" />
            Back to Jobs
          </Button>
        </Link>

        {/* Job Details */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border/50 rounded-2xl p-6 mb-8"
        >
          <h1 className="text-2xl font-display font-bold mb-3">{job.title}</h1>
          <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
            {job.description}
          </p>
        </motion.div>

        {/* Application Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border/50 rounded-2xl p-6"
        >
          <h2 className="text-xl font-display font-bold mb-6">Apply for this Position</h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              applyMutation.mutate();
            }}
            className="space-y-5"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  required
                  value={formData.applicantName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, applicantName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  required
                  value={formData.applicantEmail}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, applicantEmail: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resume">Resume (PDF, DOCX)</Label>
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                <Upload className="size-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  {resumeFile
                    ? resumeFile.name
                    : "Drag and drop or click to upload your resume"}
                </p>
                <Input
                  id="resume"
                  type="file"
                  accept=".pdf,.docx,.doc"
                  className="max-w-xs mx-auto"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cover">Cover Letter (optional)</Label>
              <Textarea
                id="cover"
                placeholder="Tell us why you're a great fit for this role..."
                rows={5}
                value={formData.coverLetter}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, coverLetter: e.target.value }))
                }
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full rounded-full"
              disabled={applyMutation.isPending}
            >
              {applyMutation.isPending ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
