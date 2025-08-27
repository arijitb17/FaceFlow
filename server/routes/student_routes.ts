// routes/students.ts
import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { insertStudentSchema } from "@shared/schema";
import { z } from "zod";

export function registerStudentRoutes(app: Express) {
  // Get all students
  app.get("/api/students", async (_req: Request, res: Response) => {
    try {
      const students = await storage.getStudents();
      res.json(students);
    } catch (error) {
      console.error("Get students error:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  // Create student
  app.post("/api/students", async (req: Request, res: Response) => {
    try {
      const validatedData = insertStudentSchema.parse(req.body);
      const student = await storage.createStudent(validatedData);
      res.status(201).json(student);
    } catch (error) {
      if (error instanceof z.ZodError) 
        return res.status(400).json({ message: "Invalid student data", errors: error.errors });
      console.error(error);
      res.status(500).json({ message: "Failed to create student" });
    }
  });

  // Get student by ID
  app.get("/api/students/:id", async (req: Request, res: Response) => {
    try {
      const student = await storage.getStudent(req.params.id);

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      res.json(student);
    } catch (error) {
      console.error("Error fetching student:", error);
      res.status(500).json({ message: "Failed to fetch student" });
    }
  });

  // Update student
  app.put("/api/students/:id", async (req: Request, res: Response) => {
    try {
      const student = await storage.updateStudent(req.params.id, req.body);
      if (!student) return res.status(404).json({ message: "Student not found" });
      res.json(student);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to update student" });
    }
  });

  // Delete student
  app.delete("/api/students/:id", async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteStudent(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Student not found" });
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to delete student" });
    }
  });

  // Get student by user ID
  app.get("/api/students/by-user/:userId", async (req: Request, res: Response) => {
    try {
      const student = await storage.getStudentByStudentId(req.params.userId);
      if (!student) return res.status(404).json({ message: "Student not found" });
      res.json(student);
    } catch (error) {
      console.error("Error fetching student by userId:", error);
      res.status(500).json({ message: "Failed to fetch student" });
    }
  });
}