import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { apiFetch } from "@/lib/api";
import { Loader2, Briefcase, Clock, FileText, ExternalLink, Mic } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import type { Application } from "@/types";

interface MyApplication {
  application: Application;
  jobTitle: string;
  jobStatus: string;
  interviewCount: number;
  latestInterviewStatus: string | null;
}

export default function MyApplicationsPage() {
  const { data: applications, isLoading } = useQuery<MyApplication[]>({
    queryKey: ["/api/my-applications"],
    queryFn: async () => {
      const res = await apiFetch("/api/my-applications");
      if (!res.ok) throw new Error("Failed to fetch applications");
      return res.json();
    },
  });

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      reviewed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      accepted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      shortlisted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      interviewing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    };
    return styles[status] || "bg-muted text-muted-foreground";
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">My Applications</h1>
            <p className="text-muted-foreground mt-1">
              Track the status of your job applications.
            </p>
          </div>
          <Link href="/board">
            <Button className="rounded-full">
              <Briefcase className="size-4 mr-2" />
              Browse Jobs
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !applications || applications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <FileText className="size-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-bold font-display mb-2">No applications yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              You haven't applied to any jobs yet. Browse the job board to find your next
              opportunity.
            </p>
            <Link href="/board">
              <Button className="rounded-full">Browse Open Positions</Button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {applications.length} application{applications.length !== 1 ? "s" : ""}
            </p>
            {applications.map((item, i) => (
              <motion.div
                key={item.application.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="bg-card border border-border/50 rounded-2xl p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold font-display truncate">
                      {item.jobTitle}
                    </h3>
                    {item.application.coverLetter && (
                      <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                        {item.application.coverLetter}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {item.application.createdAt
                          ? new Date(item.application.createdAt).toLocaleDateString()
                          : "Recently"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-medium capitalize ${statusBadge(
                          item.application.status
                        )}`}
                      >
                        {item.application.status}
                      </span>
                        {item.application.resumeUrl && (
                          <a
                            href={item.application.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <FileText className="size-3" />
                            Resume
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                        {item.interviewCount > 0 && (
                          <Link href="/my-interviews">
                            <Badge
                              variant="outline"
                              className="cursor-pointer bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 gap-1"
                            >
                              <Mic className="size-3" />
                              Interview {item.latestInterviewStatus === "completed" ? "Completed" : "Invited"}
                            </Badge>
                          </Link>
                        )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        item.jobStatus === "open"
                          ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                          : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                      }`}
                    >
                      Job {item.jobStatus === "open" ? "Open" : "Closed"}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
