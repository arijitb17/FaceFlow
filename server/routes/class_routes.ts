// routes/classes.ts
import type { Express, Response } from "express";
import { storage } from "../storage";
import { insertClassSchema, type InsertClass } from "@shared/schema";
import { authenticateToken } from "./auth_routes";
import type { AuthRequest } from "./route_types";
import { z } from "zod";

export function registerClassRoutes(app: Express) {
  // Get classes (filtered by teacher if not admin)
  app.get("/api/classes", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      let classes;
      if (userRole === "admin") {
        classes = await storage.getClasses();
      } else if (userRole === "teacher") {
        const teacher = await storage.getTeacher(userId);
        if (!teacher) {
          return res.status(404).json({ message: "Teacher profile not found" });
        }
        const allClasses = await storage.getClasses();
        classes = allClasses.filter((cls) => cls.teacherId === teacher.id);
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      const teachers = await storage.getTeachers();
      const classesWithTeachers = await Promise.all(
        classes.map(async (cls) => {
          if (cls.teacherId) {
            const teacher = teachers.find((t) => t.id === cls.teacherId);
            if (teacher) {
              const user = await storage.getUser(teacher.userId);
              return {
                ...cls,
                teacher: {
                  ...teacher,
                  user: { name: user?.name || "Unknown", email: user?.email },
                },
              };
            }
          }
          return cls;
        })
      );

      res.json(classesWithTeachers);
    } catch (error) {
      console.error("Get classes error:", error);
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

// Create class
app.post("/api/classes", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || !userRole || !["admin", "teacher"].includes(userRole)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Determine teacherId
    let teacherId = req.body.teacherId;
    if (userRole === "teacher") {
      const teacher = await storage.getTeacher(userId);
      if (!teacher) {
        return res.status(404).json({ message: "Teacher profile not found" });
      }
      teacherId = teacher.id;
    }

    // Parse request data via Zod
    const validatedData = insertClassSchema.parse({
      ...req.body,
      teacherId: teacherId ?? undefined, // null -> undefined
    });

    // Ensure teacherId is never null for storage
    const cleanedData: InsertClass & { teacherId?: string } = {
      ...validatedData,
      teacherId: validatedData.teacherId ?? undefined,
    };

    const newClass = await storage.createClass(cleanedData);

    res.status(201).json(newClass);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid class data", errors: error.errors });
    }
    console.error("Create class error:", error);
    res.status(500).json({ message: "Failed to create class" });
  }
});


  // Get single class
  app.get("/api/classes/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { userId, role } = req.user ?? {};
      const classId = req.params.id;

      const cls = await storage.getClass(classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });

      if (role === "teacher") {
        const teacher = await storage.getTeacher(userId!);
        if (!teacher || cls.teacherId !== teacher.id) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      if (cls.teacherId) {
        const teacher = (await storage.getTeachers()).find((t) => t.id === cls.teacherId);
        if (teacher) {
          const user = await storage.getUser(teacher.userId);
          return res.json({
            ...cls,
            teacher: { ...teacher, user: { name: user?.name || "Unknown", email: user?.email } },
          });
        }
      }

      res.json(cls);
    } catch (error) {
      console.error("Get class error:", error);
      res.status(500).json({ message: "Failed to fetch class" });
    }
  });

  // Update class
  app.put("/api/classes/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { userId, role } = req.user ?? {};
      const classId = req.params.id;

      const cls = await storage.getClass(classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });

      if (role === "teacher") {
        const teacher = await storage.getTeacher(userId!);
        if (!teacher || cls.teacherId !== teacher.id) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const updatedClass = await storage.updateClass(classId, req.body);
      res.json(updatedClass);
    } catch (error) {
      console.error("Update class error:", error);
      res.status(500).json({ message: "Failed to update class" });
    }
  });

  // Delete class
  app.delete("/api/classes/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { userId, role } = req.user ?? {};
      const classId = req.params.id;

      const cls = await storage.getClass(classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });

      if (role === "teacher") {
        const teacher = await storage.getTeacher(userId!);
        if (!teacher || cls.teacherId !== teacher.id) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const deleted = await storage.deleteClass(classId);
      if (deleted) {
        res.json({ message: "Class deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete class" });
      }
    } catch (error) {
      console.error("Delete class error:", error);
      res.status(500).json({ message: "Failed to delete class" });
    }
  });

  // Get students in class
  app.get("/api/classes/:id/students", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { userId, role } = req.user ?? {};
      const classId = req.params.id;

      const cls = await storage.getClass(classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });

      if (role === "teacher") {
        const teacher = await storage.getTeacher(userId!);
        if (!teacher || cls.teacherId !== teacher.id) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const students = await storage.getClassStudents(classId);
      res.json(students);
    } catch (error) {
      console.error("Get class students error:", error);
      res.status(500).json({ message: "Failed to fetch class students" });
    }
  });

  // Enroll student
  app.post("/api/classes/:id/enroll", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const classId = req.params.id;
      const { studentId } = req.body;

      if (!studentId) return res.status(400).json({ message: "studentId is required" });

      const cls = await storage.getClass(classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });

      const student = await storage.getStudent(studentId);
      if (!student) return res.status(404).json({ message: "Student not found" });

      const existing = await storage.getClassStudents(classId);
      if (existing.some((s: any) => s.id === studentId)) {
        return res.status(400).json({ message: "Student already enrolled" });
      }

      await storage.enrollStudent(classId, studentId);
      res.json({ message: "Student enrolled successfully" });
    } catch (err) {
      console.error("Enroll student error:", err);
      res.status(500).json({ message: "Failed to enroll student" });
    }
  });

  // Unenroll student
  app.delete("/api/classes/:id/students/:studentId", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { id: classId, studentId } = req.params;

      const cls = await storage.getClass(classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });

      const student = await storage.getStudent(studentId);
      if (!student) return res.status(404).json({ message: "Student not found" });

      await storage.unenrollStudent(classId, studentId);
      res.json({ message: "Student unenrolled successfully" });
    } catch (err) {
      console.error("Unenroll student error:", err);
      res.status(500).json({ message: "Failed to unenroll student" });
    }
  });
}
