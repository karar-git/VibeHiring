import type { Express } from "express";
import { storage } from "./storage.js";
import { requireAuth, handleRegister, handleLogin, handleGetMe } from "./auth.js";
import multer from "multer";
import fs from "fs";

// AI service URL (separate Railway project)
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5001";

const upload = multer({ dest: "uploads/" });

// Strip null bytes and invalid UTF-8 sequences that PostgreSQL rejects
function sanitizeText(text: string): string {
  if (!text) return text;
  return text.replace(/\x00/g, "").replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

// Strip markdown code fences (```json ... ```) that LLMs sometimes wrap around JSON
function stripMarkdownCodeFences(text: string): string {
  if (!text) return text;
  const trimmed = text.trim();
  // Match ```json\n...\n``` or ```\n...\n```
  const match = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  return match ? match[1].trim() : trimmed;
}

// Simple CSV parser that handles quoted fields (including newlines and commas within quotes)
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          // Escaped quote
          field += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        current.push(field);
        field = "";
        i++;
      } else if (ch === "\r" || ch === "\n") {
        current.push(field);
        field = "";
        rows.push(current);
        current = [];
        // Skip \r\n
        if (ch === "\r" && i + 1 < text.length && text[i + 1] === "\n") {
          i += 2;
        } else {
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    }
  }

  // Push last field/row
  if (field || current.length > 0) {
    current.push(field);
    rows.push(current);
  }

  return rows;
}

export function registerRoutes(app: Express): void {
  // ─── Auth Routes ───
  app.post("/api/auth/register", handleRegister);
  app.post("/api/auth/login", handleLogin);
  app.get("/api/auth/me", requireAuth, handleGetMe);

  // ─── Helper ───
  const checkLimits = async (userId: string) => {
    let sub = await storage.getSubscription(userId);
    if (!sub) {
      sub = await storage.createSubscription(userId);
    }
    const limit = sub.plan === "free" ? 5 : sub.plan === "pro" ? 50 : 999999;
    return (sub.cvCount || 0) < limit;
  };

  // ─── Jobs API ───
  app.get("/api/jobs", requireAuth, async (req, res) => {
    const userId = req.userId!;
    const jobsList = await storage.listJobs(userId);

    // Attach candidate count to each job
    const jobsWithCounts = await Promise.all(
      jobsList.map(async (job) => {
        const candidateCount = await storage.getCandidateCountByJob(job.id);
        return { ...job, candidateCount };
      })
    );

    res.json(jobsWithCounts);
  });

  app.get("/api/jobs/stats", requireAuth, async (req, res) => {
    const userId = req.userId!;
    const stats = await storage.getJobStats(userId);
    res.json(stats);
  });

  app.get("/api/jobs/:id", requireAuth, async (req, res) => {
    const job = await storage.getJob(Number(req.params.id));
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.userId !== req.userId) return res.status(403).json({ message: "Forbidden" });
    const candidateCount = await storage.getCandidateCountByJob(job.id);
    res.json({ ...job, candidateCount });
  });

  app.post("/api/jobs", requireAuth, async (req, res) => {
    const userId = req.userId!;
    const { title, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }
    const newJob = await storage.createJob({ title, description, userId });
    res.status(201).json(newJob);
  });

  app.patch("/api/jobs/:id", requireAuth, async (req, res) => {
    const job = await storage.getJob(Number(req.params.id));
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.userId !== req.userId) return res.status(403).json({ message: "Forbidden" });

    const { title, description, status } = req.body;
    const updated = await storage.updateJob(job.id, { title, description, status });
    res.json(updated);
  });

  app.delete("/api/jobs/:id", requireAuth, async (req, res) => {
    const job = await storage.getJob(Number(req.params.id));
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.userId !== req.userId) return res.status(403).json({ message: "Forbidden" });

    await storage.deleteJob(job.id);
    res.status(204).send();
  });

  // ─── Candidates API (scoped to jobs) ───
  app.get("/api/jobs/:jobId/candidates", requireAuth, async (req, res) => {
    const job = await storage.getJob(Number(req.params.jobId));
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.userId !== req.userId) return res.status(403).json({ message: "Forbidden" });

    const list = await storage.listCandidatesByJob(job.id);
    res.json(list);
  });

  app.post("/api/jobs/:jobId/candidates", requireAuth, upload.single("resumeFile"), async (req, res) => {
    const userId = req.userId!;
    const jobId = Number(req.params.jobId);

    const job = await storage.getJob(jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.userId !== userId) return res.status(403).json({ message: "Forbidden" });

    const canUpload = await checkLimits(userId);
    if (!canUpload) {
      return res.status(403).json({ message: "Plan limit reached. Please upgrade." });
    }

    try {
      const file = req.file;
      const { name, email } = req.body;
      let githubUrl = req.body.githubUrl || null;
      let cvText = "";
      let analysis: any = {};

      if (file) {
        // Forward to Python AI service using native FormData
        const fileBuffer = fs.readFileSync(file.path);
        const blob = new Blob([fileBuffer], { type: file.mimetype });
        const formData = new FormData();
        formData.append("cv", blob, file.originalname);
        // Use the job's description for AI analysis
        formData.append("job_description", job.description);
        if (githubUrl) {
          formData.append("github_url", githubUrl);
        }

        try {
          const aiResponse = await fetch(`${AI_SERVICE_URL}/analyze`, {
            method: "POST",
            body: formData,
          });

          if (!aiResponse.ok) {
            const errBody = await aiResponse.text();
            console.error(`AI service returned ${aiResponse.status}:`, errBody);
            throw new Error(`AI service error: ${aiResponse.status} - ${errBody}`);
          }

          const result = (await aiResponse.json()) as any;

          // Pick up GitHub URL extracted from PDF if user didn't provide one
          if (!githubUrl && result.github_url) {
            githubUrl = result.github_url;
          }

          if (result.result) {
            try {
              const rawResult = typeof result.result === "string" ? result.result : JSON.stringify(result.result);
              const cleaned = stripMarkdownCodeFences(rawResult);
              const parsed = JSON.parse(cleaned);
              analysis = {
                skills: parsed.skills || [],
                experience: parsed.experience || [],
                education: parsed.education || [],
                projects: parsed.projects || [],
                score: parsed.matching_score || parsed.score || 0,
                vibeCodingScore: parsed.vibe_coding_score ?? 0,
                categoryScores: parsed.category_scores || null,
                analysisSummary: sanitizeText(parsed.summary || parsed.overall_fit || String(result.result)),
                rankReason: sanitizeText(parsed.rank_reason || ""),
              };
            } catch {
              analysis = {
                skills: [],
                experience: [],
                education: [],
                projects: [],
                score: 50,
                vibeCodingScore: 0,
                categoryScores: null,
                analysisSummary: sanitizeText(String(result.result)),
                rankReason: "AI provided text summary",
              };
            }
          }
          cvText = sanitizeText(result.cv_text || "");
        } catch (e) {
          console.error("Error calling AI service:", e);
          cvText = "Could not extract text - AI service unavailable.";
          analysis = {
            skills: [],
            experience: [],
            education: [],
            projects: [],
            score: 0,
            vibeCodingScore: 0,
            categoryScores: null,
            analysisSummary: "AI analysis unavailable - the AI service may be starting up. Please try again in a moment.",
            rankReason: "Analysis pending",
          };
        }
      }

      const newCandidate = await storage.createCandidate({
        name: name || "Unknown Candidate",
        email: email || null,
        resumeUrl: file ? `/uploads/${file.filename}` : "",
        githubUrl: githubUrl || null,
        cvText,
        userId,
        jobId,
        ...analysis,
      });

      await storage.incrementCvCount(userId);

      // Keep uploaded file for "View Original Resume" feature
      // (files persist until the next deploy on Railway)

      res.status(201).json(newCandidate);
    } catch (error) {
      console.error("Error processing candidate:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // ─── CSV Bulk Import ───
  app.post("/api/jobs/:jobId/candidates/import-csv", requireAuth, upload.single("csvFile"), async (req, res) => {
    const userId = req.userId!;
    const jobId = Number(req.params.jobId);

    const job = await storage.getJob(jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.userId !== userId) return res.status(403).json({ message: "Forbidden" });

    const file = req.file;
    if (!file) return res.status(400).json({ message: "CSV file is required" });

    try {
      const csvContent = fs.readFileSync(file.path, "utf-8");
      // Clean up temp file
      fs.unlinkSync(file.path);

      // Simple CSV parser: split by newlines, handle quoted fields
      const rows = parseCSV(csvContent);
      if (rows.length < 2) {
        return res.status(400).json({ message: "CSV must have a header row and at least one data row" });
      }

      const headers = rows[0].map((h: string) => h.trim().toLowerCase().replace(/\s+/g, "_"));
      const nameIdx = headers.indexOf("name");
      const emailIdx = headers.indexOf("email");
      const cvTextIdx = headers.indexOf("cv_text");
      const githubIdx = headers.indexOf("github_url");

      if (cvTextIdx === -1) {
        return res.status(400).json({ message: "CSV must have a 'cv_text' column" });
      }

      const dataRows = rows.slice(1).filter((row: string[]) => row.some((cell: string) => cell.trim()));
      const results: { imported: number; failed: number; errors: string[] } = {
        imported: 0,
        failed: 0,
        errors: [],
      };

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 2; // 1-based, accounting for header

        // Check plan limits before each candidate
        const canUpload = await checkLimits(userId);
        if (!canUpload) {
          results.errors.push(`Row ${rowNum}: Plan limit reached. Remaining rows skipped.`);
          results.failed += dataRows.length - i;
          break;
        }

        const cvText = (row[cvTextIdx] || "").trim();
        if (!cvText) {
          results.errors.push(`Row ${rowNum}: Empty cv_text, skipped`);
          results.failed++;
          continue;
        }

        const name = (nameIdx >= 0 ? row[nameIdx] : "").trim() || `Candidate (Row ${rowNum})`;
        const email = (emailIdx >= 0 ? row[emailIdx] : "").trim() || null;
        let githubUrl = (githubIdx >= 0 ? row[githubIdx] : "").trim() || null;

        try {
          // Call AI service /analyze-text endpoint
          let analysis: any = {};
          let analyzedCvText = cvText;

          try {
            const aiResponse = await fetch(`${AI_SERVICE_URL}/analyze-text`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                cv_text: cvText,
                job_description: job.description,
                github_url: githubUrl || undefined,
              }),
            });

            if (!aiResponse.ok) {
              const errBody = await aiResponse.text();
              console.error(`AI service returned ${aiResponse.status} for row ${rowNum}:`, errBody);
              throw new Error(`AI error: ${aiResponse.status}`);
            }

            const result = (await aiResponse.json()) as any;

            if (!githubUrl && result.github_url) {
              githubUrl = result.github_url;
            }

            if (result.result) {
              try {
                const rawResult = typeof result.result === "string" ? result.result : JSON.stringify(result.result);
                const cleaned = stripMarkdownCodeFences(rawResult);
                const parsed = JSON.parse(cleaned);
                analysis = {
                  skills: parsed.skills || [],
                  experience: parsed.experience || [],
                  education: parsed.education || [],
                  projects: parsed.projects || [],
                  score: parsed.matching_score || parsed.score || 0,
                  vibeCodingScore: parsed.vibe_coding_score ?? 0,
                  categoryScores: parsed.category_scores || null,
                  analysisSummary: sanitizeText(parsed.summary || parsed.overall_fit || String(result.result)),
                  rankReason: sanitizeText(parsed.rank_reason || ""),
                };
              } catch {
                analysis = {
                  skills: [],
                  experience: [],
                  education: [],
                  projects: [],
                  score: 50,
                  vibeCodingScore: 0,
                  categoryScores: null,
                  analysisSummary: sanitizeText(String(result.result)),
                  rankReason: "AI provided text summary",
                };
              }
            }
            analyzedCvText = sanitizeText(result.cv_text || cvText);
          } catch (aiErr) {
            console.error(`AI service error for row ${rowNum}:`, aiErr);
            analysis = {
              skills: [],
              experience: [],
              education: [],
              projects: [],
              score: 0,
              vibeCodingScore: 0,
              categoryScores: null,
              analysisSummary: "AI analysis unavailable - will retry later.",
              rankReason: "Analysis pending",
            };
            analyzedCvText = sanitizeText(cvText);
          }

          await storage.createCandidate({
            name,
            email,
            resumeUrl: "",
            githubUrl,
            cvText: analyzedCvText,
            userId,
            jobId,
            ...analysis,
          });

          await storage.incrementCvCount(userId);
          results.imported++;
        } catch (rowErr: any) {
          console.error(`Error processing CSV row ${rowNum}:`, rowErr);
          results.errors.push(`Row ${rowNum}: ${rowErr.message || "Unknown error"}`);
          results.failed++;
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error processing CSV import:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Keep legacy endpoint for backward compat & direct candidate access
  app.get("/api/candidates", requireAuth, async (req, res) => {
    const userId = req.userId!;
    const list = await storage.listCandidates(userId);
    res.json(list);
  });

  app.get("/api/candidates/:id", requireAuth, async (req, res) => {
    const candidate = await storage.getCandidate(Number(req.params.id));
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });
    res.json(candidate);
  });

  app.delete("/api/candidates/:id", requireAuth, async (req, res) => {
    await storage.deleteCandidate(Number(req.params.id));
    res.status(204).send();
  });

  // ─── Subscription API ───
  app.get("/api/subscription", requireAuth, async (req, res) => {
    const userId = req.userId!;
    let sub = await storage.getSubscription(userId);
    if (!sub) {
      sub = await storage.createSubscription(userId);
    }
    res.json(sub);
  });

  app.post("/api/subscription/upgrade", requireAuth, async (req, res) => {
    const userId = req.userId!;
    const { plan } = req.body;
    if (!["free", "pro", "enterprise"].includes(plan)) {
      return res.status(400).json({ message: "Invalid plan" });
    }
    const sub = await storage.updateSubscription(userId, plan);
    res.json(sub);
  });
}
