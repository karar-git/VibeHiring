import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Briefcase, MapPin, Clock, ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import type { Job } from "@/types";

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function JobBoardPage() {
  const [search, setSearch] = useState("");

  const { data: jobs, isLoading } = useQuery<Job[]>({
    queryKey: ["/api/board/jobs"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/board/jobs`);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json();
    },
  });

  const filteredJobs = jobs?.filter(
    (job) =>
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.description.toLowerCase().includes(search.toLowerCase())
  );

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
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="font-medium">HR Login</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Find Your Next{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
                Dream Job
              </span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Browse open positions from companies using AI-powered hiring. Apply directly and get
              evaluated fairly.
            </p>
            <div className="max-w-lg mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search jobs by title or keyword..."
                className="pl-12 h-14 rounded-full text-base border-2"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Jobs List */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-6">
          {isLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Loading open positions...</p>
            </div>
          ) : !filteredJobs || filteredJobs.length === 0 ? (
            <div className="text-center py-16">
              <Briefcase className="size-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-2">No jobs found</h3>
              <p className="text-muted-foreground">
                {search
                  ? "Try a different search term."
                  : "No open positions at the moment. Check back later!"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                {filteredJobs.length} open position{filteredJobs.length !== 1 ? "s" : ""}
              </p>
              {filteredJobs.map((job, i) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Link href={`/board/${job.id}`}>
                    <div className="bg-card border border-border/50 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold font-display group-hover:text-primary transition-colors">
                            {job.title}
                          </h3>
                          <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                            {job.description.slice(0, 200)}
                            {job.description.length > 200 ? "..." : ""}
                          </p>
                          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {job.createdAt
                                ? new Date(job.createdAt).toLocaleDateString()
                                : "Recently"}
                            </span>
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-medium">
                              {job.status}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="size-5 text-muted-foreground group-hover:text-primary transition-colors mt-1 flex-shrink-0" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border/50 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-muted-foreground">
          Powered by{" "}
          <Link href="/">
            <span className="font-bold text-foreground cursor-pointer hover:text-primary transition-colors">
              VibeHiring
            </span>
          </Link>{" "}
          - AI-powered recruitment
        </div>
      </footer>
    </div>
  );
}
