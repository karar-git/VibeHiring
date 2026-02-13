import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { storage } from "./storage.js";
import { registerSchema, loginSchema } from "../shared/schema.js";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const JWT_EXPIRES_IN = "7d";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

// Middleware to require auth
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }

  req.userId = payload.userId;
  next();
}

// Auth route handlers
export async function handleRegister(req: Request, res: Response) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
    }

    const { email, password, firstName, lastName, role } = parsed.data;

    // Check if user already exists
    const existing = await storage.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await storage.createUser(email, passwordHash, firstName, lastName, role);
    const token = generateToken(user.id);

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function handleLogin(req: Request, res: Response) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const { email, password } = parsed.data;
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user.id);

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function handleGetMe(req: Request, res: Response) {
  try {
    const user = await storage.getUserById(req.userId!);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      profileImageUrl: user.profileImageUrl,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Get me error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
