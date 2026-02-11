import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes.js";
import { createServer } from "http";
import { pool } from "./db.js";

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.resolve("uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Run DB migrations at startup (creates tables if they don't exist)
async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" varchar PRIMARY KEY,
        "email" varchar NOT NULL UNIQUE,
        "password_hash" varchar NOT NULL,
        "first_name" varchar,
        "last_name" varchar,
        "profile_image_url" varchar,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "jobs" (
        "id" serial PRIMARY KEY,
        "title" text NOT NULL,
        "description" text NOT NULL,
        "status" text NOT NULL DEFAULT 'open',
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        "user_id" varchar REFERENCES "users"("id")
      );

      CREATE TABLE IF NOT EXISTS "candidates" (
        "id" serial PRIMARY KEY,
        "name" text NOT NULL,
        "email" text,
        "resume_url" text NOT NULL,
        "github_url" text,
        "cv_text" text,
        "skills" jsonb,
        "experience" jsonb,
        "education" jsonb,
        "projects" jsonb,
        "score" integer,
        "vibe_coding_score" integer,
        "category_scores" jsonb,
        "analysis_summary" text,
        "rank_reason" text,
        "created_at" timestamp DEFAULT now(),
        "user_id" varchar REFERENCES "users"("id"),
        "job_id" integer REFERENCES "jobs"("id")
      );

      CREATE TABLE IF NOT EXISTS "user_subscriptions" (
        "id" serial PRIMARY KEY,
        "user_id" varchar NOT NULL UNIQUE REFERENCES "users"("id"),
        "plan" text NOT NULL DEFAULT 'free',
        "cv_count" integer DEFAULT 0,
        "last_reset" timestamp DEFAULT now()
      );
    `);
    // Add new columns to existing tables (safe to run multiple times)
    await client.query(`
      ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "job_id" integer REFERENCES "jobs"("id");
      ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "category_scores" jsonb;
      ALTER TABLE "candidates" DROP COLUMN IF EXISTS "job_description";
    `);
    console.log("Database tables verified/created successfully");
  } catch (err) {
    console.error("Migration error:", err);
    throw err;
  } finally {
    client.release();
  }
}

// CORS - allow frontend origin
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
  cors({
    origin: FRONTEND_URL.split(",").map((u) => u.trim()),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve uploaded resume files
app.use("/uploads", express.static(path.resolve("uploads")));

// Request logging
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse).slice(0, 200)}`;
      }
      log(logLine);
    }
  });

  next();
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Register API routes
registerRoutes(app);

// Error handler
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error("Internal Server Error:", err);
  if (res.headersSent) return next(err);
  return res.status(status).json({ message });
});

// Start server
const port = parseInt(process.env.PORT || "5000", 10);
const httpServer = createServer(app);

runMigrations()
  .then(() => {
    httpServer.listen({ port, host: "0.0.0.0" }, () => {
      log(`API server running on port ${port}`);
      log(`CORS enabled for: ${FRONTEND_URL}`);
    });
  })
  .catch((err) => {
    console.error("Failed to run migrations, exiting:", err);
    process.exit(1);
  });
