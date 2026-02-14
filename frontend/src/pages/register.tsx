import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Briefcase, User } from "lucide-react";

export default function RegisterPage() {
  const { register, registerMutation, isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"hr" | "applicant">("hr");

  if (isAuthenticated && user) {
    setLocation(user.role === "applicant" ? "/board" : "/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await register({
        email,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        role,
      });
      setLocation(result.user.role === "applicant" ? "/board" : "/dashboard");
    } catch {
      // Error is available via registerMutation.error
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="/logo.png" alt="VibeHire" className="size-10 rounded-xl object-contain" />
          <span className="font-display font-bold text-2xl tracking-tight">VibeHire</span>
        </div>

        <Card className="border-border/60 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">Create your account</CardTitle>
            <CardDescription>Choose how you want to use VibeHire</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {registerMutation.error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20">
                  {registerMutation.error.message}
                </div>
              )}

              {/* Role Selector */}
              <div className="space-y-2">
                <Label>I am a...</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("hr")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      role === "hr"
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                        : "border-border/60 hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className={`size-10 rounded-full flex items-center justify-center ${
                      role === "hr" ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      <Briefcase className="size-5" />
                    </div>
                    <div className="text-center">
                      <div className={`text-sm font-semibold ${role === "hr" ? "text-primary" : ""}`}>Hiring Manager</div>
                      <div className="text-xs text-muted-foreground">Post jobs & review CVs</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("applicant")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      role === "applicant"
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                        : "border-border/60 hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className={`size-10 rounded-full flex items-center justify-center ${
                      role === "applicant" ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      <User className="size-5" />
                    </div>
                    <div className="text-center">
                      <div className={`text-sm font-semibold ${role === "applicant" ? "text-primary" : ""}`}>Job Seeker</div>
                      <div className="text-xs text-muted-foreground">Browse & apply to jobs</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full h-11 font-semibold"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  role === "hr" ? "Create HR Account" : "Create Job Seeker Account"
                )}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{" "}
                <Link href="/login" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
