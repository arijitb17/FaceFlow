// routes/auth.ts
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { loginSchema, studentLoginSchema } from "@shared/schema";
import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Extend Express Request to include user
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

export function registerAuthRoutes(app: Express) {
  // Admin/Teacher login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password, role } = loginSchema.parse(req.body);

      const user = await storage.validateCredentials(username, password, role);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });

      if (role === "admin" && user.role !== "admin") {
        return res.status(403).json({ message: "Access denied: not an admin" });
      }

      await storage.updateLastLogin(user.id);

      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      const userWithProfile = await storage.getUserWithProfile(user.id);
      res.json({ token, user: userWithProfile });
    } catch (error) {
      if (error instanceof z.ZodError)
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Student login
  app.post("/api/auth/student-login", async (req: Request, res: Response) => {
    try {
      const { email, rollNo, password } = studentLoginSchema.parse(req.body);

      // Find student by email and rollNo
      const students = await storage.getStudents();
      const student = students.find(s => s.email === email && s.rollNo === rollNo);
      
      if (!student || !student.userId) {
        return res.status(401).json({ message: "Invalid student credentials" });
      }

      // Get user record
      const user = await storage.getUser(student.userId);
      if (!user || user.role !== "student") {
        return res.status(401).json({ message: "Invalid student credentials" });
      }

      // Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid student credentials" });
      }

      await storage.updateLastLogin(user.id);

      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      const userWithProfile = await storage.getUserWithProfile(user.id);
      return res.json({ token, user: userWithProfile });
    } catch (error) {
      if (error instanceof z.ZodError)
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      console.error("Student login error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user profile
  app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const userWithProfile = await storage.getUserWithProfile(userId);
      if (!userWithProfile) return res.status(404).json({ message: "User not found" });
      
      const { password, ...safeUser } = userWithProfile;
      res.json(safeUser);
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
app.patch("/api/auth/me", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { name, email, password, currentPassword, program, yearLevel, rollNo } = req.body;

    // --- user fields ---
    const userUpdates: any = {};
    if (email !== undefined) userUpdates.email = email;
    if (name !== undefined) userUpdates.name = name;

    if (password !== undefined) {
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (currentPassword) {
        const ok = await bcrypt.compare(currentPassword, user.password);
        if (!ok) return res.status(400).json({ message: "Current password is incorrect" });
      }
      userUpdates.password = await bcrypt.hash(password, 10);
    }

    if (Object.keys(userUpdates).length > 0) {
      await storage.updateUser(userId, userUpdates);
      console.log("User updated:", userUpdates);
    }

    // --- profile fields ---
    const profileUpdates: any = {};
    if (program !== undefined) profileUpdates.program = program;
    if (yearLevel !== undefined) profileUpdates.yearLevel = yearLevel;
    if (rollNo !== undefined) profileUpdates.rollNo = rollNo;

    if (Object.keys(profileUpdates).length > 0) {
      await storage.updateProfile(userId, profileUpdates);
      console.log("Profile updated:", profileUpdates);
    }

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