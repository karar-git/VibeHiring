import { useJob, useDeleteJob, useUpdateJob } from "@/hooks/use-jobs";
import { useCandidatesByJob, useDeleteCandidate } from "@/hooks/use-candidates";
import { useApplicationsByJob, useUpdateApplicationStatus, useDeleteApplication } from "@/hooks/use-applications";
import { useInterviewsByJob, useCreateInterview } from "@/hooks/use-interviews";
import { ChatWidget } from "@/components/chat-widget";
import { Layout } from "@/components/layout";
import { UploadDialog } from "@/components/upload-dialog";
import { ImportCsvDialog } from "@/components/import-csv-dialog";
import { CandidateCard } from "@/components/candidate-card";
import { Link, useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  ArrowLeft,
  Users,
  Upload,
  Trash2,
  FileText,
  FileSpreadsheet,
  TrendingUp,
  Award,
  Globe,
  Inbox,
  Mic,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { Application } from "@/types";

export default function JobDetailPage() {
  const [, params] = useRoute("/jobs/:id");
  const id = parseInt(params?.id || "0");
  const { data: job, isLoading: jobLoading } = useJob(id);
  const { data: candidates, isLoading: candidatesLoading } = useCandidatesByJob(id);
  const { data: applications, isLoading: appsLoading } = useApplicationsByJob(id);
  const { data: interviews, isLoading: interviewsLoading } = useInterviewsByJob(id);
  const { mutate: deleteJob, isPending: isDeleting } = useDeleteJob();
  const { mutate: deleteCandidate } = useDeleteCandidate(id);
  const { mutate: updateJob } = useUpdateJob();
  const updateAppStatus = useUpdateApplicationStatus();
  const deleteApplication = useDeleteApplication();
  const createInterview = useCreateInterview();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"candidates" | "applications" | "interviews">("candidates");

  const handleDeleteJob = () => {
    if (!confirm("Delete this job and all its candidates? This cannot be undone.")) return;
    deleteJob(id, {
      onSuccess: () => {
        toast({ title: "Job deleted" });
        navigate("/jobs");
      },
      onError: (err) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
    });
  };

  const handleDeleteCandidate = (candidateId: number) => {
    if (!confirm("Delete this candidate?")) return;
    deleteCandidate(candidateId, {
      onSuccess: () => toast({ title: "Candidate deleted" }),
      onError: (err) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
    });
  };

  const toggleStatus = () => {
    if (!job) return;
    const newStatus = job.status === "open" ? "closed" : "open";
    updateJob(
      { id: job.id, status: newStatus },
      {
        onSuccess: () => toast({ title: `Job ${newStatus === "open" ? "reopened" : "closed"}` }),
      }
    );
  };

  const togglePublic = () => {
    if (!job) return;
    updateJob(
      { id: job.id, isPublic: !job.isPublic },
      {
        onSuccess: () =>
          toast({
            title: job.isPublic ? "Job is now private" : "Job is now public",
            description: job.isPublic
              ? "This job is no longer visible on the public board."
              : "This job is now visible on the public job board.",
          }),
      }
    );
  };

  const handleAppStatus = (appId: number, status: string) => {
    updateAppStatus.mutate(
      { id: appId, status },
      { onSuccess: () => toast({ title: `Application ${status}` }) }
    );
  };

  const handleDeleteApp = (appId: number) => {
    if (!confirm("Delete this application?")) return;
    deleteApplication.mutate(appId, {
      onSuccess: () => toast({ title: "Application deleted" }),
    });
  };

  const handleStartInterview = (candidateId?: number, applicationId?: number) => {
    createInterview.mutate(
      { jobId: id, candidateId, applicationId },
      {
        onSuccess: () => toast({ title: "Interview created", description: "AI interview session has been initialized." }),
        onError: (err) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
      }
    );
  };

  if (jobLoading) {
    return (
      <Layout>
        <div className="h-[80vh] flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!job) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold">Job Not Found</h1>
          <Link href="/jobs">
            <Button className="mt-4">Back to Jobs</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const avgScore = candidates?.length
    ? Math.round(candidates.reduce((sum, c) => sum + (c.score || 0), 0) / candidates.length)
    : 0;
  const topCandidates = candidates?.filter((c) => (c.score || 0) >= 80).length || 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Link href="/jobs">
            <Button variant="ghost" size="icon" className="rounded-full mt-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display font-bold truncate">{job.title}</h1>
              <Badge
                variant="outline"
                className={`shrink-0 cursor-pointer ${
                  job.status === "open"
                    ? "bg-green-100 text-green-700 border-green-200"
                    : "bg-red-100 text-red-700 border-red-200"
                }`}
                onClick={toggleStatus}
              >
                {job.status === "open" ? "Open" : "Closed"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Created {format(new Date(job.createdAt || new Date()), "MMM d, yyyy")}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <ImportCsvDialog
              jobId={id}
              trigger={
                <Button variant="outline" className="gap-2">
                  <FileSpreadsheet className="size-4" />
                  Import CSV
                </Button>
              }
            />
            <UploadDialog
              jobId={id}
              trigger={
                <Button className="gap-2 shadow-lg shadow-primary/20">
                  <Upload className="size-4" />
                  Upload CV
                </Button>
              }
            />
            <Button
              variant="destructive"
              size="icon"
              className="rounded-full"
              onClick={handleDeleteJob}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </Button>
          </div>
        </div>

        {/* Job Description + Public Toggle */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display flex items-center gap-2 text-base">
                <FileText className="size-4 text-muted-foreground" />
                Job Description
              </CardTitle>
              <div className="flex items-center gap-3">
                <Label htmlFor="public-toggle" className="text-sm text-muted-foreground flex items-center gap-2 cursor-pointer">
                  <Globe className="size-4" />
                  Public Board
                </Label>
                <Switch
                  id="public-toggle"
                  checked={job.isPublic}
                  onCheckedChange={togglePublic}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {job.description}
            </p>
            {job.isPublic && (
              <div className="mt-4 p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-center gap-2 text-sm">
                <Globe className="size-4 text-primary" />
                <span className="text-muted-foreground">
                  This job is visible on the{" "}
                  <Link href="/board">
                    <span className="text-primary font-medium cursor-pointer hover:underline">public job board</span>
                  </Link>
                  . Candidates can apply directly.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border/60 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{candidates?.length || 0}</p>
                <p className="text-xs text-muted-foreground font-medium">Total Candidates</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <TrendingUp className="size-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{avgScore}%</p>
                <p className="text-xs text-muted-foreground font-medium">Avg Match Score</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-green-500/10">
                <Award className="size-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{topCandidates}</p>
                <p className="text-xs text-muted-foreground font-medium">Top Talent (80%+)</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Candidates | Applications | Interviews */}
        <div>
          <div className="flex items-center gap-1 mb-4 bg-muted/50 rounded-xl p-1 w-fit">
            {[
              { key: "candidates" as const, label: "Candidates", count: candidates?.length || 0, icon: Users },
              { key: "applications" as const, label: "Applications", count: applications?.length || 0, icon: Inbox },
              { key: "interviews" as const, label: "Interviews", count: interviews?.length || 0, icon: Mic },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="size-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Candidates Tab */}
          {activeTab === "candidates" && (
            <>
              {candidatesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !candidates || candidates.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-2xl border-border/50">
                  <Users className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <h3 className="mt-4 text-base font-semibold">No candidates yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload CVs to start evaluating candidates for this position.
                  </p>
                  <div className="mt-4 flex gap-2 justify-center">
                    <UploadDialog
                      jobId={id}
                      trigger={
                        <Button variant="outline" className="gap-2">
                          <Upload className="size-4" />
                          Upload First CV
                        </Button>
                      }
                    />
                    <ImportCsvDialog
                      jobId={id}
                      trigger={
                        <Button variant="ghost" className="gap-2">
                          <FileSpreadsheet className="size-4" />
                          Import CSV
                        </Button>
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence mode="popLayout">
                    {candidates.map((candidate) => (
                      <motion.div
                        key={candidate.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        layout
                      >
                        <CandidateCard
                          candidate={candidate}
                          onDelete={handleDeleteCandidate}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}

          {/* Applications Tab */}
          {activeTab === "applications" && (
            <>
              {appsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !applications || applications.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-2xl border-border/50">
                  <Inbox className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <h3 className="mt-4 text-base font-semibold">No applications yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {job.isPublic
                      ? "Applications from the public job board will appear here."
                      : "Make this job public to receive applications from candidates."}
                  </p>
                  {!job.isPublic && (
                    <Button variant="outline" className="mt-4 gap-2" onClick={togglePublic}>
                      <Globe className="size-4" />
                      Make Public
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {applications.map((app, i) => (
                    <motion.div
                      key={app.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-card border border-border/50 rounded-xl p-5"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-bold">{app.applicantName}</h4>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                app.status === "shortlisted"
                                  ? "bg-green-100 text-green-700 border-green-200"
                                  : app.status === "rejected"
                                  ? "bg-red-100 text-red-700 border-red-200"
                                  : app.status === "reviewed"
                                  ? "bg-blue-100 text-blue-700 border-blue-200"
                                  : "bg-yellow-100 text-yellow-700 border-yellow-200"
                              }`}
                            >
                              {app.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{app.applicantEmail}</p>
                          {app.coverLetter && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {app.coverLetter}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Applied {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "recently"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {app.resumeUrl && (
                            <Button variant="ghost" size="icon" asChild>
                              <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer">
                                <Eye className="size-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-600"
                            onClick={() => handleAppStatus(app.id, "shortlisted")}
                            disabled={app.status === "shortlisted"}
                          >
                            <CheckCircle2 className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600"
                            onClick={() => handleAppStatus(app.id, "rejected")}
                            disabled={app.status === "rejected"}
                          >
                            <XCircle className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary"
                            title="Start AI Interview"
                            onClick={() => handleStartInterview(undefined, app.id)}
                          >
                            <Mic className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDeleteApp(app.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Interviews Tab */}
          {activeTab === "interviews" && (
            <>
              {interviewsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !interviews || interviews.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-2xl border-border/50">
                  <Mic className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <h3 className="mt-4 text-base font-semibold">No interviews yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start an AI voice interview from the candidates or applications tab.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {interviews.map((interview, i) => (
                    <motion.div
                      key={interview.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-card border border-border/50 rounded-xl p-5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <Mic className="size-4 text-primary" />
                            <span className="font-bold">Interview #{interview.id}</span>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                interview.status === "completed"
                                  ? "bg-green-100 text-green-700 border-green-200"
                                  : interview.status === "in_progress"
                                  ? "bg-blue-100 text-blue-700 border-blue-200"
                                  : "bg-yellow-100 text-yellow-700 border-yellow-200"
                              }`}
                            >
                              {interview.status}
                            </Badge>
                            {interview.overallScore != null && (
                              <span className="text-sm font-bold text-primary">
                                Score: {interview.overallScore}/100
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Voice: {interview.voice || "NATF2"} | Created:{" "}
                            {interview.createdAt
                              ? new Date(interview.createdAt).toLocaleString()
                              : "recently"}
                          </p>
                          {interview.evaluation?.summary && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {interview.evaluation.summary}
                            </p>
                          )}
                          {interview.evaluation?.recommendation && (
                            <span
                              className={`inline-block mt-2 text-xs font-bold px-2 py-0.5 rounded-full capitalize ${
                                interview.evaluation.recommendation === "hire"
                                  ? "bg-green-100 text-green-700"
                                  : interview.evaluation.recommendation === "pass"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {interview.evaluation.recommendation}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <ChatWidget jobId={id} />
    </Layout>
  );
}
