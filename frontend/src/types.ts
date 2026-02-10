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
