import { useJob, useDeleteJob, useUpdateJob } from "@/hooks/use-jobs";
import { useCandidatesByJob, useDeleteCandidate } from "@/hooks/use-candidates";
import { Layout } from "@/components/layout";
import { UploadDialog } from "@/components/upload-dialog";
import { ImportCsvDialog } from "@/components/import-csv-dialog";
import { CandidateCard } from "@/components/candidate-card";
import { Link, useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function JobDetailPage() {
  const [, params] = useRoute("/jobs/:id");
  const id = parseInt(params?.id || "0");
  const { data: job, isLoading: jobLoading } = useJob(id);
  const { data: candidates, isLoading: candidatesLoading } = useCandidatesByJob(id);
  const { mutate: deleteJob, isPending: isDeleting } = useDeleteJob();
  const { mutate: deleteCandidate } = useDeleteCandidate(id);
  const { mutate: updateJob } = useUpdateJob();
  const [, navigate] = useLocation();
  const { toast } = useToast();

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

        {/* Job Description */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-base">
              <FileText className="size-4 text-muted-foreground" />
              Job Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {job.description}
            </p>
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

        {/* Candidates List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-bold">Candidates</h2>
          </div>

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
        </div>
      </div>
    </Layout>
  );
}
