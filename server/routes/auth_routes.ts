// routes/auth.ts - Fixed version with secure HttpOnly cookie
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { loginSchema, studentLoginSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import jwt, { JwtPayload as DefaultJwtPayload } from "jsonwebtoken";

interface CustomJwtPayload extends DefaultJwtPayload {
  userId: string;
  username: string;
  role: string;
}
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface AuthRequest extends Request {
  user?: { userId: string; username: string; role: string };
}

// -------------------
// Middleware
// -------------------
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.cookies?.token || req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Access token required" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role
    };
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
};
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: "Admin access required" });
  next();
};

// -------------------
// Routes
// -------------------
export function registerAuthRoutes(app: Express) {
  app.use(cookieParser()); // 👈 Needed to read cookies

  // ---------------- ADMIN / TEACHER LOGIN ----------------
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password, role } = loginSchema.parse(req.body);

      const user = await storage.validateCredentials(
        username.trim(),
        password.trim(),
        role
      );

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      await storage.updateLastLogin(user.id);

      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      // 👇 Set secure HttpOnly cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });

      const userWithProfile = await storage.getUserWithProfile(user.id);
      const { password: _, ...safeUser } = userWithProfile || {};
      res.json({ user: safeUser }); // Don’t send token back
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

      const user = await storage.validateCredentials(
        email.trim(),
        password.trim(),
        "student",
        rollNo.trim()
      );

      if (!user) {
        return res.status(401).json({ message: "Invalid student credentials" });
      }

      await storage.updateLastLogin(user.id);

      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      // 👇 Secure HttpOnly cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000
      });

      const userWithProfile = await storage.getUserWithProfile(user.id);
      const { password: _, ...safeUser } = userWithProfile || {};
      return res.json({ user: safeUser });
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
      if (email !== undefined) userUpdates.email = email.trim().toLowerCase();
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

  // ---------------- LOGOUT ----------------
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.clearCookie("token"); // 👈 clear cookie on logout
    res.json({ message: "Logged out" });
  });
}
