import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import fs from "fs";
import path from "path";
import FormData from "form-data";

// Python AI service URL
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5001";

const upload = multer({ dest: "uploads/" });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // Helper to check subscription limits
  const checkLimits = async (userId: string) => {
    let sub = await storage.getSubscription(userId);
    if (!sub) {
      sub = await storage.createSubscription(userId);
    }
    const limit = sub.plan === 'free' ? 5 : sub.plan === 'pro' ? 50 : 999999;
    if ((sub.cvCount || 0) >= limit) {
      return false;
    }
    return true;
  };

  // Candidates API
  app.get(api.candidates.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).claims.sub;
    const candidates = await storage.listCandidates(userId);
    res.json(candidates);
  });

  app.get(api.candidates.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const candidate = await storage.getCandidate(Number(req.params.id));
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });
    res.json(candidate);
  });

  app.post(api.candidates.create.path, upload.single("resumeFile"), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).claims.sub;

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
        // Call Python AI service for resume analysis
        const formData = new FormData();
        formData.append("file", fs.createReadStream(file.path), {
          filename: file.originalname,
          contentType: file.mimetype
        });
        if (githubUrl) {
          formData.append("github_url", githubUrl);
        }

        try {
          const aiResponse = await fetch(`${AI_SERVICE_URL}/api/analyze-resume`, {
            method: "POST",
            body: formData as any,
            headers: formData.getHeaders()
          });

          if (!aiResponse.ok) {
            throw new Error(`AI service error: ${aiResponse.status}`);
          }

          const result = await aiResponse.json() as any;
          cvText = result.cv_text || "";
          analysis = result.analysis || {};
        } catch (e) {
          console.error("Error calling AI service:", e);
          // Fallback: try to read file as text
          try {
            cvText = fs.readFileSync(file.path, 'utf-8');
          } catch {
            cvText = "Could not parse file content.";
          }
          analysis = {
            skills: [],
            experience: [],
            education: [],
            projects: [],
            score: 0,
            vibeCodingScore: 0,
            analysisSummary: "AI analysis unavailable",
            rankReason: "Analysis failed"
          };
        }
      }

      const newCandidate = await storage.createCandidate({
        name: name || "Unknown Candidate",
        email: email,
        resumeUrl: file ? file.path : "",
        githubUrl,
        cvText,
        userId,
        ...analysis // Spread extracted fields
      });

      await storage.incrementCvCount(userId);

      // Cleanup uploaded file
      if (file) fs.unlinkSync(file.path);

      res.status(201).json(newCandidate);

    } catch (error) {
      console.error("Error processing candidate:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.delete(api.candidates.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    await storage.deleteCandidate(Number(req.params.id));
    res.status(204).send();
  });

  // Subscription API
  app.get(api.subscription.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).claims.sub;
    let sub = await storage.getSubscription(userId);
    if (!sub) {
      sub = await storage.createSubscription(userId);
    }
    res.json(sub);
  });

  app.post(api.subscription.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).claims.sub;
    const { plan } = req.body;
    const sub = await storage.updateSubscription(userId, plan);
    res.json(sub);
  });

  return httpServer;
}
