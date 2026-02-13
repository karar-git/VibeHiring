// Plain TypeScript types for the frontend (no Drizzle imports)

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  createdAt: string;
}

export interface Job {
  id: number;
  title: string;
  description: string;
  status: string;
  isPublic: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  userId: string | null;
  candidateCount?: number;
}

export interface JobStats {
  totalJobs: number;
  openJobs: number;
  totalCandidates: number;
  avgScore: number;
}

export interface CategoryScores {
  technical: number;
  experience: number;
  education: number;
  soft_skills: number;
  culture_fit: number;
  growth: number;
}

export interface Candidate {
  id: number;
  name: string;
  email: string | null;
  resumeUrl: string;
  githubUrl: string | null;
  cvText: string | null;
  skills: string[] | null;
  experience: any[] | null;
  education: any[] | null;
  projects: any[] | null;
  score: number | null;
  vibeCodingScore: number | null;
  categoryScores: CategoryScores | null;
  analysisSummary: string | null;
  rankReason: string | null;
  createdAt: string | null;
  userId: string | null;
  jobId: number | null;
}

export interface UserSubscription {
  id: number;
  userId: string;
  plan: string;
  cvCount: number | null;
  lastReset: string | null;
}

export interface Application {
  id: number;
  jobId: number;
  applicantName: string;
  applicantEmail: string;
  resumeUrl: string | null;
  coverLetter: string | null;
  status: string;
  createdAt: string | null;
}

export interface InterviewEvaluation {
  overall_score?: number;
  communication_score?: number;
  technical_score?: number;
  enthusiasm_score?: number;
  cultural_fit_score?: number;
  strengths?: string[];
  weaknesses?: string[];
  summary?: string;
  recommendation?: "hire" | "maybe" | "pass";
}

export interface Interview {
  id: number;
  jobId: number;
  candidateId: number | null;
  applicationId: number | null;
  sessionId: string;
  status: string;
  voice: string | null;
  conversation: Array<{ role: string; text: string }> | null;
  evaluation: InterviewEvaluation | null;
  overallScore: number | null;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  userId: string | null;
}
