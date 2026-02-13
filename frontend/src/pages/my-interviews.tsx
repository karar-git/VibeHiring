import { Layout } from "@/components/layout";
import { useMyInterviews } from "@/hooks/use-interviews";
import { Loader2, Mic, Clock, CheckCircle2, AlertCircle, Briefcase } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function MyInterviewsPage() {
  const { data: interviews, isLoading } = useMyInterviews();

  const statusConfig: Record<string, { label: string; style: string; icon: React.ReactNode }> = {
    pending: {
      label: "Invited",
      style: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
      icon: <Clock className="size-4 text-yellow-500" />,
    },
    in_progress: {
      label: "In Progress",
      style: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
      icon: <AlertCircle className="size-4 text-blue-500" />,
    },
    completed: {
      label: "Completed",
      style: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
      icon: <CheckCircle2 className="size-4 text-green-600" />,
    },
    cancelled: {
      label: "Cancelled",
      style: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
      icon: <AlertCircle className="size-4 text-red-500" />,
    },
  };

  const getConfig = (status: string) =>
    statusConfig[status] || statusConfig.pending;

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">My Interviews</h1>
            <p className="text-muted-foreground mt-1">
              View your interview invitations and results.
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
        ) : !interviews || interviews.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <Mic className="size-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-bold font-display mb-2">
              No interviews yet
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              When a hiring manager invites you for an AI interview, it will
              appear here.
            </p>
            <Link href="/board">
              <Button className="rounded-full">Browse Open Positions</Button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {interviews.length} interview{interviews.length !== 1 ? "s" : ""}
            </p>
            {interviews.map((item, i) => {
              const config = getConfig(item.interview.status);
              return (
                <motion.div
                  key={item.interview.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="bg-card border border-border/50 rounded-2xl p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {config.icon}
                        <h3 className="text-base font-bold font-display truncate">
                          {item.jobTitle}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground pl-6">
                        <Badge
                          variant="outline"
                          className={`text-xs ${config.style}`}
                        >
                          {config.label}
                        </Badge>

                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {item.interview.createdAt
                            ? new Date(
                                item.interview.createdAt
                              ).toLocaleDateString()
                            : "Recently"}
                        </span>

                        {item.interview.voice && (
                          <span className="flex items-center gap-1">
                            <Mic className="size-3" />
                            Voice: {item.interview.voice}
                          </span>
                        )}
                      </div>

                      {item.interview.evaluation?.summary && (
                        <p className="text-sm text-muted-foreground mt-3 pl-6">
                          {item.interview.evaluation.summary}
                        </p>
                      )}

                      {item.interview.overallScore != null && (
                        <div className="mt-3 pl-6">
                          <span className="text-sm font-bold text-primary">
                            Score: {item.interview.overallScore}/100
                          </span>
                          {item.interview.evaluation?.recommendation && (
                            <span
                              className={`ml-3 inline-block text-xs font-bold px-2 py-0.5 rounded-full capitalize ${
                                item.interview.evaluation.recommendation ===
                                "hire"
                                  ? "bg-green-100 text-green-700"
                                  : item.interview.evaluation
                                      .recommendation === "pass"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {item.interview.evaluation.recommendation}
                            </span>
                          )}
                        </div>
                      )}

                      {item.interview.scheduledAt && (
                        <p className="text-xs text-muted-foreground mt-2 pl-6">
                          Scheduled:{" "}
                          {new Date(
                            item.interview.scheduledAt
                          ).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
