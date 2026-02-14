import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Loader2,
  Pencil,
  Save,
  X,
  MapPin,
  Mail,
  Phone,
  Linkedin,
  Github,
  Globe,
  Briefcase,
  GraduationCap,
  Plus,
  Trash2,
  Sparkles,
} from "lucide-react";
import type { User, WorkExperience, Education } from "@/types";

interface ProfileData {
  firstName: string;
  lastName: string;
  headline: string;
  bio: string;
  location: string;
  phone: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  workExperience: WorkExperience[];
  education: Education[];
  skills: string[];
}

function emptyExperience(): WorkExperience {
  return { company: "", role: "", startDate: "", endDate: "", description: "" };
}

function emptyEducation(): Education {
  return { school: "", degree: "", field: "", startDate: "", endDate: "" };
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [skillInput, setSkillInput] = useState("");

  const { data: profile, isLoading } = useQuery<User>({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const res = await apiFetch("/api/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
  });

  const [form, setForm] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    headline: "",
    bio: "",
    location: "",
    phone: "",
    linkedinUrl: "",
    githubUrl: "",
    portfolioUrl: "",
    workExperience: [],
    education: [],
    skills: [],
  });

  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        headline: profile.headline || "",
        bio: profile.bio || "",
        location: profile.location || "",
        phone: profile.phone || "",
        linkedinUrl: profile.linkedinUrl || "",
        githubUrl: profile.githubUrl || "",
        portfolioUrl: profile.portfolioUrl || "",
        workExperience: profile.workExperience || [],
        education: profile.education || [],
        skills: profile.skills || [],
      });
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      const res = await apiFetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/profile"], data);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setEditing(false);
      toast({ title: "Profile saved", description: "Your profile has been updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(form);
  };

  const handleCancel = () => {
    if (profile) {
      setForm({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        headline: profile.headline || "",
        bio: profile.bio || "",
        location: profile.location || "",
        phone: profile.phone || "",
        linkedinUrl: profile.linkedinUrl || "",
        githubUrl: profile.githubUrl || "",
        portfolioUrl: profile.portfolioUrl || "",
        workExperience: profile.workExperience || [],
        education: profile.education || [],
        skills: profile.skills || [],
      });
    }
    setEditing(false);
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !form.skills.includes(s)) {
      setForm((f) => ({ ...f, skills: [...f.skills, s] }));
      setSkillInput("");
    }
  };

  const removeSkill = (idx: number) => {
    setForm((f) => ({ ...f, skills: f.skills.filter((_, i) => i !== idx) }));
  };

  const addExperience = () => {
    setForm((f) => ({ ...f, workExperience: [...f.workExperience, emptyExperience()] }));
  };

  const updateExperience = (idx: number, field: keyof WorkExperience, value: string) => {
    setForm((f) => ({
      ...f,
      workExperience: f.workExperience.map((exp, i) =>
        i === idx ? { ...exp, [field]: value } : exp
      ),
    }));
  };

  const removeExperience = (idx: number) => {
    setForm((f) => ({ ...f, workExperience: f.workExperience.filter((_, i) => i !== idx) }));
  };

  const addEducation = () => {
    setForm((f) => ({ ...f, education: [...f.education, emptyEducation()] }));
  };

  const updateEducation = (idx: number, field: keyof Education, value: string) => {
    setForm((f) => ({
      ...f,
      education: f.education.map((edu, i) =>
        i === idx ? { ...edu, [field]: value } : edu
      ),
    }));
  };

  const removeEducation = (idx: number) => {
    setForm((f) => ({ ...f, education: f.education.filter((_, i) => i !== idx) }));
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

  const displayName = [form.firstName, form.lastName].filter(Boolean).join(" ") || "Your Name";

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">My Profile</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Build your professional profile to stand out to employers.
            </p>
          </div>
          {!editing ? (
            <Button className="gap-2" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                <X className="size-4 mr-1" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
                {saveMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save
              </Button>
            </div>
          )}
        </div>

        {/* Profile Card (LinkedIn-style header) */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden border-border/60">
            {/* Banner */}
            <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-blue-500/10" />

            <CardContent className="relative pt-0 pb-6 px-6">
              {/* Avatar */}
              <div className="-mt-16 mb-4">
                <Avatar className="size-28 border-4 border-background shadow-xl">
                  <AvatarImage src={profile?.profileImageUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                    {form.firstName?.[0]}
                    {form.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input
                        value={form.firstName}
                        onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                        placeholder="John"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input
                        value={form.lastName}
                        onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Headline</Label>
                    <Input
                      value={form.headline}
                      onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
                      placeholder="e.g. Full Stack Developer | React & Node.js"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bio</Label>
                    <Textarea
                      value={form.bio}
                      onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                      placeholder="Tell employers about yourself, your passions, and career goals..."
                      rows={4}
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        value={form.location}
                        onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                        placeholder="San Francisco, CA"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-display font-bold">{displayName}</h2>
                  {form.headline && (
                    <p className="text-muted-foreground mt-1">{form.headline}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                    {form.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3.5" />
                        {form.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Mail className="size-3.5" />
                      {profile?.email}
                    </span>
                    {form.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="size-3.5" />
                        {form.phone}
                      </span>
                    )}
                  </div>
                  {form.bio && (
                    <p className="text-sm text-muted-foreground mt-4 leading-relaxed whitespace-pre-wrap">
                      {form.bio}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Links */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="font-display text-base flex items-center gap-2">
                <Globe className="size-4 text-muted-foreground" />
                Links
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>LinkedIn URL</Label>
                    <Input
                      value={form.linkedinUrl}
                      onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
                      placeholder="https://linkedin.com/in/yourprofile"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>GitHub URL</Label>
                    <Input
                      value={form.githubUrl}
                      onChange={(e) => setForm((f) => ({ ...f, githubUrl: e.target.value }))}
                      placeholder="https://github.com/yourusername"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Portfolio / Website</Label>
                    <Input
                      value={form.portfolioUrl}
                      onChange={(e) => setForm((f) => ({ ...f, portfolioUrl: e.target.value }))}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {form.linkedinUrl && (
                    <a
                      href={form.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors"
                    >
                      <Linkedin className="size-4" />
                      LinkedIn
                    </a>
                  )}
                  {form.githubUrl && (
                    <a
                      href={form.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Github className="size-4" />
                      GitHub
                    </a>
                  )}
                  {form.portfolioUrl && (
                    <a
                      href={form.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors"
                    >
                      <Globe className="size-4" />
                      Portfolio
                    </a>
                  )}
                  {!form.linkedinUrl && !form.githubUrl && !form.portfolioUrl && (
                    <p className="text-sm text-muted-foreground">No links added yet.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Skills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="font-display text-base flex items-center gap-2">
                <Sparkles className="size-4 text-muted-foreground" />
                Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      placeholder="Add a skill (e.g. React, Python)"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
                    />
                    <Button variant="outline" onClick={addSkill} type="button">
                      <Plus className="size-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.skills.map((skill, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="pl-3 pr-1.5 py-1.5 gap-1 text-sm"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(i)}
                          className="ml-1 hover:text-destructive transition-colors"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {form.skills.length > 0 ? (
                    form.skills.map((skill, i) => (
                      <Badge key={i} variant="secondary" className="px-3 py-1.5 text-sm">
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No skills added yet.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Work Experience */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="border-border/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <Briefcase className="size-4 text-muted-foreground" />
                  Work Experience
                </CardTitle>
                {editing && (
                  <Button variant="outline" size="sm" onClick={addExperience}>
                    <Plus className="size-4 mr-1" />
                    Add
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {form.workExperience.length === 0 ? (
                <p className="text-sm text-muted-foreground">No work experience added yet.</p>
              ) : (
                <div className="space-y-6">
                  {form.workExperience.map((exp, i) => (
                    <div key={i}>
                      {i > 0 && <Separator className="mb-6" />}
                      {editing ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground uppercase">
                              Experience {i + 1}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive"
                              onClick={() => removeExperience(i)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Role / Title</Label>
                              <Input
                                value={exp.role}
                                onChange={(e) => updateExperience(i, "role", e.target.value)}
                                placeholder="Software Engineer"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Company</Label>
                              <Input
                                value={exp.company}
                                onChange={(e) => updateExperience(i, "company", e.target.value)}
                                placeholder="Acme Inc."
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Start Date</Label>
                              <Input
                                value={exp.startDate}
                                onChange={(e) => updateExperience(i, "startDate", e.target.value)}
                                placeholder="Jan 2022"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">End Date</Label>
                              <Input
                                value={exp.endDate}
                                onChange={(e) => updateExperience(i, "endDate", e.target.value)}
                                placeholder="Present"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Description</Label>
                            <Textarea
                              value={exp.description}
                              onChange={(e) => updateExperience(i, "description", e.target.value)}
                              placeholder="What you did, accomplished, technologies used..."
                              rows={3}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-4">
                          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Briefcase className="size-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm">{exp.role || "Untitled Role"}</h4>
                            <p className="text-sm text-muted-foreground">{exp.company}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {exp.startDate}
                              {exp.endDate ? ` - ${exp.endDate}` : ""}
                            </p>
                            {exp.description && (
                              <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">
                                {exp.description}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Education */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <GraduationCap className="size-4 text-muted-foreground" />
                  Education
                </CardTitle>
                {editing && (
                  <Button variant="outline" size="sm" onClick={addEducation}>
                    <Plus className="size-4 mr-1" />
                    Add
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {form.education.length === 0 ? (
                <p className="text-sm text-muted-foreground">No education added yet.</p>
              ) : (
                <div className="space-y-6">
                  {form.education.map((edu, i) => (
                    <div key={i}>
                      {i > 0 && <Separator className="mb-6" />}
                      {editing ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground uppercase">
                              Education {i + 1}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive"
                              onClick={() => removeEducation(i)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">School / University</Label>
                              <Input
                                value={edu.school}
                                onChange={(e) => updateEducation(i, "school", e.target.value)}
                                placeholder="MIT"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Degree</Label>
                              <Input
                                value={edu.degree}
                                onChange={(e) => updateEducation(i, "degree", e.target.value)}
                                placeholder="B.S."
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Field of Study</Label>
                              <Input
                                value={edu.field}
                                onChange={(e) => updateEducation(i, "field", e.target.value)}
                                placeholder="Computer Science"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Start</Label>
                                <Input
                                  value={edu.startDate}
                                  onChange={(e) => updateEducation(i, "startDate", e.target.value)}
                                  placeholder="2018"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">End</Label>
                                <Input
                                  value={edu.endDate}
                                  onChange={(e) => updateEducation(i, "endDate", e.target.value)}
                                  placeholder="2022"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-4">
                          <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                            <GraduationCap className="size-5 text-blue-500" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm">{edu.school || "Untitled School"}</h4>
                            <p className="text-sm text-muted-foreground">
                              {[edu.degree, edu.field].filter(Boolean).join(" in ")}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {edu.startDate}
                              {edu.endDate ? ` - ${edu.endDate}` : ""}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}
