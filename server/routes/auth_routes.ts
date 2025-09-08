// routes/auth.ts - Fixed version with proper normalization
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { loginSchema, studentLoginSchema } from "@shared/schema";
import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface AuthRequest extends Request {
  user?: { userId: string; username: string; role: string };
}

// -------------------
// Middleware
// -------------------
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];
  if (!token) return res.status(401).json({ message: "Access token required" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user as { userId: string; username: string; role: string };
    next();
  });
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: "Admin access required" });
  next();
};

// -------------------
// Routes
// -------------------
export function registerAuthRoutes(app: Express) {

  // ---------------- ADMIN / TEACHER LOGIN ----------------
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password, role } = loginSchema.parse(req.body);

      console.log("Login attempt:", {
        username: username.trim(),
        role,
        timestamp: new Date().toISOString()
      });

      // Validate credentials with proper normalization
      const user = await storage.validateCredentials(
        username.trim(), // Let storage handle normalization
        password.trim(),
        role 
      );

      if (!user) {
        console.log("Login failed for username:", username.trim());
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log("Login successful for user:", user.id);
      await storage.updateLastLogin(user.id);

      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      const userWithProfile = await storage.getUserWithProfile(user.id);
      const { password: _, ...safeUser } = userWithProfile || {};
      res.json({ token, user: safeUser });
    } catch (error) {
      if (error instanceof z.ZodError)
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ---------------- STUDENT LOGIN ----------------
  app.post("/api/auth/student-login", async (req: Request, res: Response) => {
    try {
      const { email, rollNo, password } = studentLoginSchema.parse(req.body);

      console.log("Student login attempt:", {
        email: email.trim(),
        rollNo: rollNo.trim(),
        timestamp: new Date().toISOString()
      });

      // Use the optimized DB query with proper normalization
      const user = await storage.validateCredentials(
        email.trim(), // Let storage handle email normalization
        password.trim(), 
        "student", 
        rollNo.trim()
      );

      if (!user) {
        console.log("Student login failed for email:", email.trim());
        return res.status(401).json({ message: "Invalid student credentials" });
      }

      console.log("Student login successful for user:", user.id);
      await storage.updateLastLogin(user.id);

      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      const userWithProfile = await storage.getUserWithProfile(user.id);
      const { password: _, ...safeUser } = userWithProfile || {};
      return res.json({ token, user: safeUser });
    } catch (error) {
      if (error instanceof z.ZodError)
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      console.error("Student login error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ---------------- GET CURRENT USER ----------------
  app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const userWithProfile = await storage.getUserWithProfile(userId);
      if (!userWithProfile) return res.status(404).json({ message: "User not found" });

      const { password, ...safeUser } = userWithProfile as any;
      res.json(safeUser);
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ---------------- UPDATE CURRENT USER ----------------
  app.patch("/api/auth/me", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { name, email, password, currentPassword, program, yearLevel, rollNo } = req.body;

      // --- user fields ---
      const userUpdates: any = {};
      if (email !== undefined) userUpdates.email = email.trim().toLowerCase(); // Normalize email
      if (name !== undefined) userUpdates.name = name.trim();

      if (password !== undefined) {
        const user = await storage.getUser(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (currentPassword) {
          const ok = await bcrypt.compare(currentPassword, user.password);
          if (!ok) return res.status(400).json({ message: "Current password is incorrect" });
        }
        userUpdates.password = await bcrypt.hash(password, 10);
      }

      if (Object.keys(userUpdates).length > 0) await storage.updateUser(userId, userUpdates);

      // --- profile fields ---
      const profileUpdates: any = {};
      if (program !== undefined) profileUpdates.program = program;
      if (yearLevel !== undefined) profileUpdates.yearLevel = yearLevel;
      if (rollNo !== undefined) profileUpdates.rollNo = rollNo;

      if (Object.keys(profileUpdates).length > 0) await storage.updateProfile(userId, profileUpdates);

      // --- return fresh profile ---
      const userWithProfile = await storage.getUserWithProfile(userId);
      if (!userWithProfile) return res.status(404).json({ message: "User not found after update" });

      const { password: _, ...safeUser } = userWithProfile as any;
      res.json(safeUser);
    } catch (err) {
      console.error("Update self profile error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}