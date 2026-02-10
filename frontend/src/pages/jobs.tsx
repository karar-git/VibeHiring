import { useState } from "react";
import { useJobs, useDeleteJob } from "@/hooks/use-jobs";
import { Layout } from "@/components/layout";
import { CreateJobDialog } from "@/components/create-job-dialog";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Briefcase, Users, Trash2, Plus } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import type { Job } from "@/types";

export default function JobsPage() {
  const { data: jobs, isLoading } = useJobs();
  const { mutate: deleteJob } = useDeleteJob();
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const filtered = jobs?.filter(
    (j) =>
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this job and all its candidates?")) return;
    deleteJob(id, {
      onSuccess: () => toast({ title: "Job deleted" }),
      onError: (err) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
    });
  };

  const getStatusColor = (status: string) => {
    if (status === "open") return "bg-green-100 text-green-700 border-green-200";
    if (status === "closed") return "bg-red-100 text-red-700 border-red-200";
    return "bg-gray-100 text-gray-600 border-gray-200";
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="h-[80vh] flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Job Offers</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create job positions and upload CVs to evaluate candidates.
            </p>
          </div>
          <CreateJobDialog />
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            className="pl-10 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {(!filtered || filtered.length === 0) ? (
          <div className="text-center py-20">
            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold">No job offers yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Create your first job offer to start analyzing candidates.</p>
            <div className="mt-6">
              <CreateJobDialog
                trigger={
                  <Button className="gap-2">
                    <Plus className="size-4" />
                    Create First Job
                  </Button>
                }
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((job) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                >
                  <Link href={`/jobs/${job.id}`}>
                    <JobCard job={job} onDelete={handleDelete} getStatusColor={getStatusColor} />
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Layout>
  );
}

function JobCard({
  job,
  onDelete,
  getStatusColor,
}: {
  job: Job;
  onDelete: (id: number, e: React.MouseEvent) => void;
  getStatusColor: (status: string) => string;
}) {
  return (
    <Card className="hover-card-effect overflow-hidden border-border/50 group cursor-pointer h-full flex flex-col">
      <CardHeader className="p-5 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <h3 className="font-display font-bold text-lg leading-tight truncate">{job.title}</h3>
            <Badge variant="outline" className={`text-[10px] font-bold ${getStatusColor(job.status)}`}>
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </Badge>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => onDelete(job.id, e)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-2 flex-1">
        <p className="text-sm text-muted-foreground line-clamp-3">{job.description}</p>
      </CardContent>

      <CardFooter className="p-3 bg-muted/20 border-t border-border/40 flex justify-between items-center">
        <span className="text-[10px] text-muted-foreground font-medium">
          {format(new Date(job.createdAt || new Date()), "MMM d, yyyy")}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="size-3.5" />
          <span>{job.candidateCount || 0} candidates</span>
        </div>
      </CardFooter>
    </Card>
  );
}
