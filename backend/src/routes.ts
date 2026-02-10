import type { Express } from "express";
import { storage } from "./storage.js";
import { requireAuth, handleRegister, handleLogin, handleGetMe } from "./auth.js";
import multer from "multer";
import fs from "fs";
import FormData from "form-data";

// AI service URL (separate Railway project)
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5001";

const upload = multer({ dest: "uploads/" });

// Strip null bytes and invalid UTF-8 sequences that PostgreSQL rejects
function sanitizeText(text: string): string {
  if (!text) return text;
  // Remove null bytes (\x00) which PG cannot store
  // Remove other control chars except newline/tab/carriage return
  return text.replace(/\x00/g, "").replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, "");
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

  // ─── Candidates API ───
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

  app.post("/api/candidates", requireAuth, upload.single("resumeFile"), async (req, res) => {
    const userId = req.userId!;

    const canUpload = await checkLimits(userId);
    if (!canUpload) {
      return res.status(403).json({ message: "Plan limit reached. Please upgrade." });
    }

    try {
      const file = req.file;
      const { name, email, githubUrl } = req.body;
      let cvText = "";
      let analysis: any = {};

      if (file) {
        // Forward to Python AI service
        const formData = new FormData();
        formData.append("cv", fs.createReadStream(file.path), {
          filename: file.originalname,
          contentType: file.mimetype,
        });
        if (githubUrl) {
          formData.append("github_url", githubUrl);
        }
        // Send a default job description since the AI service requires it
        formData.append("job_description", "General software engineering position");

        try {
          const aiResponse = await fetch(`${AI_SERVICE_URL}/analyze`, {
            method: "POST",
            body: formData as any,
            headers: formData.getHeaders(),
          });

          if (!aiResponse.ok) {
            const errBody = await aiResponse.text();
            console.error(`AI service returned ${aiResponse.status}:`, errBody);
            throw new Error(`AI service error: ${aiResponse.status} - ${errBody}`);
          }

          const result = (await aiResponse.json()) as any;
          
          // Parse the AI result - it returns { result: "..." } with a text summary
          if (result.result) {
            // Try to extract structured data from AI response
            try {
              const parsed = typeof result.result === "string" ? JSON.parse(result.result) : result.result;
              analysis = {
                skills: parsed.skills || [],
                experience: parsed.experience || [],
                education: parsed.education || [],
                projects: parsed.projects || [],
                score: parsed.matching_score || parsed.score || 0,
                vibeCodingScore: parsed.vibe_coding_score || 0,
                analysisSummary: sanitizeText(parsed.summary || parsed.overall_fit || String(result.result)),
                rankReason: sanitizeText(parsed.rank_reason || ""),
              };
            } catch {
              // If it's a plain text response
              analysis = {
                skills: [],
                experience: [],
                education: [],
                projects: [],
                score: 50,
                vibeCodingScore: 0,
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
        ...analysis,
      });

      await storage.incrementCvCount(userId);

      // Cleanup uploaded file
      if (file) {
        try { fs.unlinkSync(file.path); } catch {}
      }

      res.status(201).json(newCandidate);
    } catch (error) {
      console.error("Error processing candidate:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
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
