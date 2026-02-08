import { useCandidate } from "@/hooks/use-candidates";
import { Layout } from "@/components/layout";
import { Link, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft, Github, Linkedin, Mail, Calendar, Briefcase, GraduationCap } from "lucide-react";
import { format } from "date-fns";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";

export default function CandidateDetailPage() {
  const [, params] = useRoute("/candidates/:id");
  const id = parseInt(params?.id || "0");
  const { data: candidate, isLoading } = useCandidate(id);

  if (isLoading) {
    return (
      <Layout>
        <div className="h-[80vh] flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!candidate) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold">Candidate Not Found</h1>
          <Link href="/candidates">
            <Button className="mt-4">Back to List</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  // Dummy chart data - in a real app, this would come from the AI analysis
  const chartData = [
    { subject: 'Technical', A: 85, fullMark: 100 },
    { subject: 'Experience', A: candidate.score || 60, fullMark: 100 },
    { subject: 'Education', A: 75, fullMark: 100 },
    { subject: 'Soft Skills', A: 90, fullMark: 100 },
    { subject: 'Culture Fit', A: 80, fullMark: 100 },
    { subject: 'Growth', A: 85, fullMark: 100 },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/candidates">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold">{candidate.name}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              {candidate.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="size-3.5" />
                  {candidate.email}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                Added {format(new Date(candidate.createdAt || new Date()), 'MMM d, yyyy')}
              </div>
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            {candidate.githubUrl && (
              <a href={candidate.githubUrl} target="_blank" rel="noopener">
                <Button variant="outline" size="icon" className="rounded-full">
                  <Github className="size-4" />
                </Button>
              </a>
            )}
            <Button>Contact Candidate</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Summary */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <span className="text-xl">✨</span> AI Analysis Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {candidate.analysisSummary || "AI analysis is in progress. This typically takes a few minutes..."}
                </p>
                {candidate.rankReason && (
                  <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <h4 className="font-semibold text-primary mb-1">Why this rank?</h4>
                    <p className="text-sm text-muted-foreground">{candidate.rankReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Experience */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Briefcase className="size-5 text-muted-foreground" /> Work Experience
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {candidate.experience && candidate.experience.length > 0 ? (
                  candidate.experience.map((exp: any, i) => (
                    <div key={i} className="relative pl-6 pb-6 last:pb-0 border-l border-border last:border-0">
                      <div className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
                      <h4 className="font-bold">{exp.role || "Unknown Role"}</h4>
                      <p className="text-sm font-medium text-muted-foreground">{exp.company || "Unknown Company"} • {exp.duration || "N/A"}</p>
                      <p className="text-sm mt-2 text-muted-foreground/80">{exp.description}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm italic">No experience data extracted.</p>
                )}
              </CardContent>
            </Card>

            {/* Education */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <GraduationCap className="size-5 text-muted-foreground" /> Education
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {candidate.education && candidate.education.length > 0 ? (
                  candidate.education.map((edu: any, i) => (
                    <div key={i} className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold">{edu.degree || "Degree"}</h4>
                        <p className="text-sm text-muted-foreground">{edu.school || "School"}</p>
                      </div>
                      <span className="text-xs font-medium bg-muted px-2 py-1 rounded">{edu.year || "N/A"}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm italic">No education data extracted.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            {/* Score Card */}
            <Card className="border-border/60 shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-primary to-purple-400" />
              <CardHeader>
                <CardTitle className="font-display">Overall Match</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      className="text-muted/30"
                      strokeWidth="8"
                      stroke="currentColor"
                      fill="transparent"
                      r="58"
                      cx="64"
                      cy="64"
                    />
                    <circle
                      className="text-primary transition-all duration-1000 ease-out"
                      strokeWidth="8"
                      strokeDasharray={365}
                      strokeDashoffset={365 - (365 * (candidate.score || 0)) / 100}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="58"
                      cx="64"
                      cy="64"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-bold font-display">{candidate.score || 0}%</span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Score</span>
                  </div>
                </div>
                
                {candidate.vibeCodingScore && (
                  <div className="mt-6 pt-6 border-t border-border/50">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Vibe Coding Score</span>
                      <span className="font-bold text-purple-600">{candidate.vibeCodingScore}/100</span>
                    </div>
                    <Progress value={candidate.vibeCodingScore} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2 text-left">
                      Based on GitHub analysis & coding patterns.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Skills Chart */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="font-display text-base">Skills Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <Radar
                        name="Candidate"
                        dataKey="A"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {candidate.skills?.map((skill, i) => (
                    <Badge key={i} variant="secondary" className="text-xs font-normal">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Resume Preview Link */}
            <Card className="border-border/60 shadow-sm">
              <CardContent className="pt-6">
                <Button variant="outline" className="w-full" asChild>
                  <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                    <FileText className="mr-2 h-4 w-4" />
                    View Original Resume
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
