import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { 
  CheckCircle2, 
  Check,
  Code2, 
  BrainCircuit, 
  LineChart,
  ArrowRight,
  Mic,
  Globe,
  Users
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: platformStats } = useQuery<{
    acceptedCount: number;
    completedInterviews: number;
    publicJobs: number;
  }>({
    queryKey: ["/api/public/stats"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/public/stats`);
      if (!res.ok) return { acceptedCount: 0, completedInterviews: 0, publicJobs: 0 };
      return res.json();
    },
    staleTime: 60_000,
  });

  if (!isLoading && user) {
    setLocation(user.role === "applicant" ? "/board" : "/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Navbar */}
      <header className="px-6 h-20 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm font-display">VH</span>
          </div>
          <span className="font-display font-bold text-xl tracking-tight">VibeHire</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-primary transition-colors">Features</a>
          <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
          <a href="#about" className="hover:text-primary transition-colors">About</a>
          <Link href="/board" className="hover:text-primary transition-colors">Job Board</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="font-medium">Log in</Button>
          </Link>
          <Link href="/register">
            <Button className="font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all rounded-full px-6">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative pt-20 pb-32 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 rounded-full blur-3xl -z-10" />
          
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                New: GitHub Vibe Coding Analysis
              </div>
              <h1 className="text-5xl md:text-6xl font-display font-bold leading-tight tracking-tight mb-6">
                Hire the top 1% <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
                  without the noise.
                </span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed mb-8 max-w-lg">
                AI-powered resume parsing that understands context, not just keywords. Visualize skills, analyze coding vibes, and rank candidates instantly.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button size="lg" className="h-14 px-8 text-base rounded-full shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all">
                    Start Hiring Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-base rounded-full border-2">
                    View Demo
                  </Button>
                </a>
              </div>
              <div className="mt-8 flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="size-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold">
                      {String.fromCharCode(64+i)}
                    </div>
                  ))}
                </div>
                <p>Trusted by 1,000+ hiring managers</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-purple-500/20 rounded-3xl blur-2xl -z-10" />
              <div className="bg-card border border-border/50 rounded-3xl shadow-2xl p-6 relative overflow-hidden">
                <div className="flex items-center justify-between mb-6 border-b border-border/50 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-muted flex items-center justify-center">JD</div>
                    <div>
                      <div className="font-bold font-display">Jane Doe</div>
                      <div className="text-xs text-muted-foreground">Senior Full Stack Engineer</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">94%</div>
                    <div className="text-xs text-muted-foreground">Match Score</div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span>React & TypeScript</span>
                      <span>Expert</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[95%]" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span>System Design</span>
                      <span>Advanced</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[85%]" />
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <div className="flex items-center gap-2 mb-2 font-semibold text-primary text-sm">
                    <BrainCircuit className="size-4" />
                    AI Insight
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Jane shows exceptional architectural understanding. Her GitHub activity suggests strong leadership in open source projects with high "vibe coding" scores.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-display font-bold mb-4">Everything you need to hire better</h2>
              <p className="text-muted-foreground">Stop drowning in PDFs. Let our AI convert resumes into actionable data points.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: BrainCircuit,
                  title: "AI Analysis",
                  desc: "Automatically extract skills, experience, and education. We understand context, not just keyword matching."
                },
                {
                  icon: Code2,
                  title: "Vibe Coding Score",
                  desc: "We analyze GitHub profiles to determine coding style, consistency, and community impact."
                },
                {
                  icon: LineChart,
                  title: "Smart Ranking",
                  desc: "Candidates are scored based on your specific job requirements, surfacing the best talent instantly."
                },
                {
                  icon: Mic,
                  title: "AI Voice Interviews",
                  desc: "Conduct automated voice interviews powered by AI. Candidates speak naturally while our AI evaluates their responses."
                },
                {
                  icon: Globe,
                  title: "Public Job Board",
                  desc: "Post jobs publicly and let candidates apply directly. Manage applications from your dashboard seamlessly."
                },
                {
                  icon: Users,
                  title: "Candidate Pipeline",
                  desc: "Track candidates from application to interview to hire. Full visibility into your recruitment funnel."
                }
              ].map((feature, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-card p-8 rounded-2xl border border-border/50 hover:shadow-lg transition-all hover:-translate-y-1"
                >
                  <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                    <feature.icon className="size-6" />
                  </div>
                  <h3 className="text-xl font-bold font-display mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-display font-bold mb-4">Simple, transparent pricing</h2>
              <p className="text-muted-foreground">Start free and scale as your hiring needs grow. No hidden fees.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  name: "Free",
                  price: "$0",
                  period: "forever",
                  description: "Perfect for small teams getting started",
                  features: [
                    "Up to 5 CV analyses per month",
                    "AI-powered resume parsing",
                    "Basic candidate ranking",
                    "1 active job posting",
                  ],
                  cta: "Get Started",
                  popular: false,
                },
                {
                  name: "Pro",
                  price: "$29",
                  period: "/month",
                  description: "For growing teams with serious hiring needs",
                  features: [
                    "Up to 50 CV analyses per month",
                    "AI Voice Interviews",
                    "Vibe Coding analysis",
                    "Public Job Board access",
                    "CSV bulk import",
                    "Priority support",
                  ],
                  cta: "Start Pro Trial",
                  popular: true,
                },
                {
                  name: "Enterprise",
                  price: "$99",
                  period: "/month",
                  description: "Unlimited hiring power for large organizations",
                  features: [
                    "Unlimited CV analyses",
                    "Unlimited AI Voice Interviews",
                    "Unlimited job postings",
                    "Advanced analytics & reporting",
                    "API access",
                    "Dedicated account manager",
                  ],
                  cta: "Contact Sales",
                  popular: false,
                },
              ].map((plan, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.15 }}
                  viewport={{ once: true }}
                  className={`relative bg-card p-8 rounded-2xl border-2 transition-all hover:-translate-y-1 ${
                    plan.popular 
                      ? "border-primary shadow-xl shadow-primary/10" 
                      : "border-border/50 hover:shadow-lg"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      Most Popular
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold font-display mb-2">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold font-display">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <Check className="size-4 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/register">
                    <Button 
                      className={`w-full rounded-full ${plan.popular ? "shadow-lg shadow-primary/20" : ""}`}
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl font-display font-bold mb-6">
                  Built for modern hiring teams
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  VibeHire was born from the frustration of sifting through hundreds of resumes manually. 
                  We believe that hiring should be about finding the right people, not drowning in paperwork.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-8">
                  Our AI-powered platform combines resume analysis, GitHub vibe coding detection, 
                  and automated voice interviews to give you a complete picture of every candidate 
                  in seconds, not hours.
                </p>
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { value: "10x", label: "Faster screening" },
                    { value: `${platformStats?.acceptedCount || 0}+`, label: "Candidates accepted" },
                    { value: `${platformStats?.completedInterviews || 0}+`, label: "Interviews completed" },
                  ].map((stat, i) => (
                    <div key={i} className="text-center">
                      <div className="text-2xl font-bold font-display text-primary">{stat.value}</div>
                      <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="space-y-4"
              >
                {[
                  {
                    title: "AI-First Approach",
                    desc: "Every feature is powered by cutting-edge AI models. From resume parsing to voice interviews, we leverage the latest in machine learning.",
                  },
                  {
                    title: "Privacy & Security",
                    desc: "Your data is encrypted at rest and in transit. We never share candidate data with third parties.",
                  },
                  {
                    title: "Open & Extensible",
                    desc: "Built with modern technologies. Integrate with your existing ATS, HRIS, or build custom workflows via our API.",
                  },
                ].map((item, i) => (
                  <div key={i} className="bg-card p-6 rounded-2xl border border-border/50">
                    <h3 className="font-bold font-display mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-card border-t border-border/50 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <div className="size-6 rounded bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-xs">VH</span>
            </div>
            <span className="font-bold font-display">VibeHire</span>
          </div>
          <div className="text-sm text-muted-foreground">
            © 2025 VibeHire. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
