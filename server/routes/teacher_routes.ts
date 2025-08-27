// routes/teachers.ts
import type { Express, Request, Response } from "express";
import { storage } from "../storage";

export function registerTeacherRoutes(app: Express) {
  // Get all teachers
  app.get("/api/teachers", async (_req: Request, res: Response) => {
    try {
      const teachers = await storage.getTeachers();
      // Populate with user data
      const teachersWithUsers = [];
      for (const teacher of teachers) {
        const user = await storage.getUser(teacher.userId);
        if (user) {
          teachersWithUsers.push({
            ...teacher,
            user: { name: user.name, email: user.email }
          });
        }
      }
      res.json(teachersWithUsers);
    } catch (error) {
      console.error("Get teachers error:", error);
      res.status(500).json({ message: "Failed to fetch teachers" });
    }
  });
}