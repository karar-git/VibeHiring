import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { useCandidates } from "@/hooks/use-candidates";
import { useSubscription } from "@/hooks/use-subscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadDialog } from "@/components/upload-dialog";
import { 
  Users, 
  Upload,
  TrendingUp, 
  Star, 
  Zap,
  ArrowRight
} from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: candidates, isLoading } = useCandidates();
  const { data: subscription } = useSubscription();

  const totalCandidates = candidates?.length || 0;
  const topCandidates = candidates?.filter(c => (c.score || 0) > 80).length || 0;
  const avgScore = totalCandidates > 0 
    ? Math.round((candidates?.reduce((acc, c) => acc + (c.score || 0), 0) || 0) / totalCandidates) 
    : 0;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back, {user?.firstName}. Here's what's happening.</p>
          </div>
          <UploadDialog />
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          <motion.div variants={item}>
            <Card className="hover-card-effect border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Candidates</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-display">{totalCandidates}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {subscription?.plan === 'free' ? `${subscription?.cvCount}/5 free limit` : 'Unlimited'}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="hover-card-effect border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-display">{avgScore}%</div>
                <p className="text-xs text-muted-foreground mt-1">Across all profiles</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="hover-card-effect border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Top Talent</CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-display">{topCandidates}</div>
                <p className="text-xs text-muted-foreground mt-1">Candidates &gt; 80% match</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="hover-card-effect border-border/60 bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-primary">Current Plan</CardTitle>
                <Zap className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-display capitalize">{subscription?.plan || 'Free'}</div>
                <Link href="/subscription">
                  <span className="text-xs text-primary font-medium hover:underline cursor-pointer flex items-center gap-1 mt-1">
                    Manage Subscription <ArrowRight className="size-3" />
                  </span>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4 border-border/60">
            <CardHeader>
              <CardTitle className="font-display">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-12 w-full bg-muted/30 rounded-lg animate-pulse" />)}
                </div>
              ) : candidates && candidates.length > 0 ? (
                <div className="space-y-4">
                  {candidates.slice(0, 5).map((candidate) => (
                    <div key={candidate.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-full bg-background border flex items-center justify-center font-bold text-muted-foreground">
                          {candidate.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium font-display leading-none">{candidate.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">Uploaded just now</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {candidate.score && (
                          <span className="text-sm font-bold text-primary">{candidate.score}%</span>
                        )}
                        <Link href={`/candidates/${candidate.id}`}>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <ArrowRight className="size-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  No candidates yet. Upload a resume to get started!
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-3 border-border/60 bg-gradient-to-b from-card to-muted/20">
            <CardHeader>
              <CardTitle className="font-display">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <UploadDialog 
                trigger={
                  <Button variant="outline" className="w-full justify-start h-12 text-left font-normal border-primary/20 hover:border-primary/50 hover:bg-primary/5 group">
                    <div className="p-2 bg-primary/10 rounded-lg mr-3 group-hover:bg-primary group-hover:text-white transition-colors">
                      <Upload className="size-4" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">Analyze New Resume</div>
                      <div className="text-xs text-muted-foreground">Upload PDF or DOCX</div>
                    </div>
                  </Button>
                } 
              />
              <Link href="/candidates">
                <Button variant="outline" className="w-full justify-start h-12 text-left font-normal border-border hover:bg-muted/50 group mt-3">
                  <div className="p-2 bg-muted rounded-lg mr-3 group-hover:bg-foreground group-hover:text-background transition-colors">
                    <Users className="size-4" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">View All Candidates</div>
                    <div className="text-xs text-muted-foreground">Manage your talent pool</div>
                  </div>
                </Button>
              </Link>
              <Link href="/subscription">
                <Button variant="outline" className="w-full justify-start h-12 text-left font-normal border-border hover:bg-muted/50 group mt-3">
                  <div className="p-2 bg-muted rounded-lg mr-3 group-hover:bg-foreground group-hover:text-background transition-colors">
                    <Zap className="size-4" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Upgrade Plan</div>
                    <div className="text-xs text-muted-foreground">Unlock more features</div>
                  </div>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
