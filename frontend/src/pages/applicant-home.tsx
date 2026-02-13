import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";
import {
  Loader2,
  Briefcase,
  Clock,
  FileText,
  ExternalLink,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Mic,
} from "lucide-react";
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

export default function ApplicantHomePage() {
  const { user } = useAuth();

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
      pending:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      reviewed:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      accepted:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      shortlisted:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      rejected:
        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      interviewing:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    };
    return styles[status] || "bg-muted text-muted-foreground";
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "accepted":
      case "shortlisted":
        return <CheckCircle2 className="size-4 text-green-600" />;
      case "rejected":
        return <XCircle className="size-4 text-red-500" />;
      case "reviewed":
      case "interviewing":
        return <AlertCircle className="size-4 text-blue-500" />;
      default:
        return <Clock className="size-4 text-yellow-500" />;
    }
  };

  // Stats
  const total = applications?.length || 0;
  const pending = applications?.filter((a) => a.application.status === "pending").length || 0;
  const reviewed = applications?.filter((a) => ["reviewed", "shortlisted", "interviewing"].includes(a.application.status)).length || 0;
  const interviewInvites = applications?.filter((a) => a.interviewCount > 0).length || 0;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-display font-bold">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your job applications and find new opportunities.
          </p>
        </div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            {
              label: "Total Applied",
              value: total,
              icon: FileText,
              color: "text-primary",
              bg: "bg-primary/10",
            },
            {
              label: "Pending",
              value: pending,
              icon: Clock,
              color: "text-yellow-600",
              bg: "bg-yellow-100 dark:bg-yellow-900/30",
            },
            {
              label: "In Review",
              value: reviewed,
              icon: AlertCircle,
              color: "text-blue-600",
              bg: "bg-blue-100 dark:bg-blue-900/30",
            },
            {
              label: "Interviews",
              value: interviewInvites,
              icon: Mic,
              color: "text-purple-600",
              bg: "bg-purple-100 dark:bg-purple-900/30",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-card border border-border/50 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`size-8 rounded-lg ${stat.bg} flex items-center justify-center`}
                >
                  <stat.icon className={`size-4 ${stat.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold font-display">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Link href="/board">
            <Button className="rounded-full">
              <Search className="size-4 mr-2" />
              Browse Jobs
            </Button>
          </Link>
        </div>

        {/* Applications List */}
        <div>
          <h2 className="text-xl font-display font-bold mb-4">
            Your Applications
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !applications || applications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 bg-card border border-border/50 rounded-2xl"
            >
              <Briefcase className="size-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-bold font-display mb-2">
                No applications yet
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                You haven't applied to any jobs yet. Browse the job board to
                find your next opportunity.
              </p>
              <Link href="/board">
                <Button className="rounded-full">Browse Open Positions</Button>
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {applications.map((item, i) => (
                <motion.div
                  key={item.application.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="bg-card border border-border/50 rounded-2xl p-5 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {statusIcon(item.application.status)}
                        <h3 className="text-base font-bold font-display truncate">
                          {item.jobTitle}
                        </h3>
                      </div>
                      {item.application.coverLetter && (
                        <p className="text-muted-foreground text-sm mt-2 line-clamp-2 pl-6">
                          {item.application.coverLetter}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground pl-6">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          Applied{" "}
                          {item.application.createdAt
                            ? new Date(
                                item.application.createdAt
                              ).toLocaleDateString()
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
                              className="cursor-pointer bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800 gap-1"
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
      </div>
    </Layout>
  );
}
