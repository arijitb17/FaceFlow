// routes/classes.ts
import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { insertClassSchema } from "@shared/schema";
import { z } from "zod";
import { authenticateToken } from "./auth_routes";
import type { AuthRequest } from "./route_types";

export function registerClassRoutes(app: Express) {
  // Get all classes with teacher and enrollment data
  app.get("/api/classes", async (_req: Request, res: Response) => {
    try {
      const classes = await storage.getClasses();
      
      // Populate with teacher data and student count
      const classesWithDetails = [];
      for (const cls of classes) {
        let teacherData = null;
        let studentCount = 0;

        // Get teacher information if teacherId exists
        if (cls.teacherId) {
          const teachers = await storage.getTeachers();
          const teacher = teachers.find(t => t.id === cls.teacherId);
          if (teacher) {
            const user = await storage.getUser(teacher.userId);
            if (user) {
              teacherData = {
                id: teacher.id,
                employeeId: teacher.employeeId,
                department: teacher.department,
                user: { 
                  id: user.id,
                  name: user.name, 
                  email: user.email 
                }
              };
            }
          }
        }

        // Get student count for this class
        try {
          const students = await storage.getClassStudents(cls.id);
          studentCount = students.length;
        } catch (error) {
          console.warn(`Could not fetch students for class ${cls.id}:`, error);
        }

        classesWithDetails.push({
          ...cls,
          teacher: teacherData,
          studentCount,
          enrollmentCount: studentCount // Alias for backward compatibility
        });
      }
      
      res.json(classesWithDetails);
    } catch (error) {
      console.error("Get classes error:", error);
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  // Create new class
  app.post("/api/classes", authenticateToken, async (req: Request, res: Response) => {
    try {
      const validatedData = insertClassSchema.parse(req.body);

      if (!validatedData.teacherId) {
        return res.status(400).json({ message: "teacherId is required" });
      }

      // Verify teacher exists
      const teachers = await storage.getTeachers();
      const teacher = teachers.find(t => t.id === validatedData.teacherId);
      if (!teacher) {
        return res.status(400).json({ message: "Teacher not found" });
      }

      const classData = await storage.createClass({
        ...validatedData,
        teacherId: validatedData.teacherId,
      });

      // Return class with teacher data
      const user = await storage.getUser(teacher.userId);
      const classWithTeacher = {
        ...classData,
        teacher: {
          id: teacher.id,
          employeeId: teacher.employeeId,
          department: teacher.department,
          user: {
            id: user?.id,
            name: user?.name,
            email: user?.email
          }
        },
        studentCount: 0
      };

      res.status(201).json(classWithTeacher);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid class data", 
          errors: error.errors 
        });
      }
      console.error("Create class error:", error);
      res.status(500).json({ message: "Failed to create class" });
    }
  });

  // Get class by ID with full details
  app.get("/api/classes/:id", async (req: Request, res: Response) => {
    try {
      const classData = await storage.getClass(req.params.id);
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }

      // Get teacher data if exists
      let teacherData = null;
      if (classData.teacherId) {
        const teachers = await storage.getTeachers();
        const teacher = teachers.find(t => t.id === classData.teacherId);
        if (teacher) {
          const user = await storage.getUser(teacher.userId);
          teacherData = {
            id: teacher.id,
            employeeId: teacher.employeeId,
            department: teacher.department,
            user: {
              id: user?.id,
              name: user?.name,
              email: user?.email
            }
          };
        }
      }

      // Get enrolled students
      const students = await storage.getClassStudents(req.params.id);

      const detailedClass = {
        ...classData,
        teacher: teacherData,
        students,
        studentCount: students.length
      };

      res.json(detailedClass);
    } catch (error) {
      console.error("Get class error:", error);
      res.status(500).json({ message: "Failed to fetch class" });
    }
  });

  // Update class
  app.put("/api/classes/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const classId = req.params.id;
      const updates = req.body;
      
      // Validate teacherId if provided
      if (updates.teacherId) {
        const teachers = await storage.getTeachers();
        const teacher = teachers.find(t => t.id === updates.teacherId);
        if (!teacher) {
          return res.status(400).json({ message: "Teacher not found" });
        }
      }
      
      const updatedClass = await storage.updateClass(classId, updates);
      
      if (!updatedClass) {
        return res.status(404).json({ message: "Class not found" });
      }

      // Return updated class with teacher data
      let teacherData = null;
      if (updatedClass.teacherId) {
        const teachers = await storage.getTeachers();
        const teacher = teachers.find(t => t.id === updatedClass.teacherId);
        if (teacher) {
          const user = await storage.getUser(teacher.userId);
          teacherData = {
            id: teacher.id,
            employeeId: teacher.employeeId,
            department: teacher.department,
            user: {
              id: user?.id,
              name: user?.name,
              email: user?.email
            }
          };
        }
      }

      const classWithTeacher = {
        ...updatedClass,
        teacher: teacherData
      };
      
      res.json(classWithTeacher);
    } catch (error) {
      console.error("Update class error:", error);
      res.status(500).json({ message: "Failed to update class" });
    }
  });

  // Delete class
  app.delete("/api/classes/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const classId = req.params.id;
      
      // Check if class exists
      const existingClass = await storage.getClass(classId);
      if (!existingClass) {
        return res.status(404).json({ message: "Class not found" });
      }

      // Check if class has active sessions
      const sessions = await storage.getAttendanceSessions();
      const classSessions = sessions.filter(s => s.classId === classId);
      
      if (classSessions.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete class with existing attendance sessions",
          sessionsCount: classSessions.length
        });
      }
      
      const deleted = await storage.deleteClass(classId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Class not found" });
      }
      
      res.json({ 
        message: "Class deleted successfully",
        deletedClassId: classId
      });
    } catch (error) {
      console.error("Delete class error:", error);
      res.status(500).json({ message: "Failed to delete class" });
    }
  });

  // Get class students with detailed information
  app.get("/api/classes/:id/students", async (req: Request, res: Response) => {
    try {
      const classId = req.params.id;
      
      // Verify class exists
      const classData = await storage.getClass(classId);
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }

      const students = await storage.getClassStudents(classId);
      
      // Add enrollment date and additional student info if needed
      const detailedStudents = students.map(student => ({
        ...student,
        enrolledAt: student.createdAt || new Date().toISOString(),
      }));

      res.json(detailedStudents);
    } catch (error) {
      console.error("Get class students error:", error);
      res.status(500).json({ message: "Failed to fetch class students" });
    }
  });

  // Enroll student in class
  app.post("/api/classes/:classId/students/:studentId", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { classId, studentId } = req.params;

      // Verify class exists
      const classData = await storage.getClass(classId);
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }

      // Verify student exists
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Check if student is already enrolled
      const existingStudents = await storage.getClassStudents(classId);
      const isAlreadyEnrolled = existingStudents.some(s => s.id === studentId);
      
      if (isAlreadyEnrolled) {
        return res.status(400).json({ 
          message: "Student is already enrolled in this class" 
        });
      }

      const enrollment = await storage.enrollStudent(classId, studentId);
      
      res.status(201).json({
        message: "Student enrolled successfully",
        enrollment,
        student: {
          id: student.id,
          name: student.name,
          studentId: student.studentId,
          rollNo: student.rollNo
        }
      });
    } catch (error) {
      console.error("Enroll student error:", error);
      res.status(500).json({ message: "Failed to enroll student" });
    }
  });

  // Unenroll student from class
  app.delete("/api/classes/:classId/students/:studentId", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { classId, studentId } = req.params;
      
      // Verify enrollment exists
      const existingStudents = await storage.getClassStudents(classId);
      const isEnrolled = existingStudents.some(s => s.id === studentId);
      
      if (!isEnrolled) {
        return res.status(404).json({ message: "Student is not enrolled in this class" });
      }

      const unenrolled = await storage.unenrollStudent(classId, studentId);
      
      if (!unenrolled) {
        return res.status(404).json({ message: "Enrollment not found" });
      }
      
      res.json({ 
        message: "Student unenrolled successfully",
        classId,
        studentId
      });
    } catch (error) {
      console.error("Unenroll student error:", error);
      res.status(500).json({ message: "Failed to unenroll student" });
    }
  });

  // Bulk enroll students
  app.post("/api/classes/:classId/students/bulk", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { classId } = req.params;
      const { studentIds } = req.body;

      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ message: "Student IDs array is required" });
      }

      // Verify class exists
      const classData = await storage.getClass(classId);
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }

      const results = [];
      const existingStudents = await storage.getClassStudents(classId);
      
      for (const studentId of studentIds) {
        try {
          // Check if student exists
          const student = await storage.getStudent(studentId);
          if (!student) {
            results.push({
              studentId,
              success: false,
              error: "Student not found"
            });
            continue;
          }

          // Check if already enrolled
          const isAlreadyEnrolled = existingStudents.some(s => s.id === studentId);
          if (isAlreadyEnrolled) {
            results.push({
              studentId,
              success: false,
              error: "Already enrolled"
            });
            continue;
          }

          // Enroll student
          await storage.enrollStudent(classId, studentId);
          results.push({
            studentId,
            success: true,
            studentName: student.name
          });
        } catch (error) {
          results.push({
            studentId,
            success: false,
            error: "Enrollment failed"
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      
      res.json({
        message: `Bulk enrollment completed: ${successCount}/${studentIds.length} students enrolled`,
        results,
        summary: {
          total: studentIds.length,
          successful: successCount,
          failed: studentIds.length - successCount
        }
      });
    } catch (error) {
      console.error("Bulk enroll error:", error);
      res.status(500).json({ message: "Failed to perform bulk enrollment" });
    }
  });

  // Get sessions for a specific class
  app.get("/api/classes/:id/sessions", async (req: Request, res: Response) => {
    try {
      const classId = req.params.id;
      
      // Verify class exists
      const classData = await storage.getClass(classId);
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }

      const sessions = await storage.getAttendanceSessions();
      
      // Filter sessions by class and populate with class data
      const classSessions = sessions.filter(s => s.classId === classId);
      
      const detailedSessions = classSessions.map(session => ({
        ...session,
        sessionDate: session.date,
        startTime: session.date,
        endTime: session.date,
        class: {
          id: classData.id,
          name: classData.name,
          code: classData.code,
          description: classData.description
        }
      }));
      
      res.json(detailedSessions);
    } catch (error) {
      console.error("Class sessions error:", error);
      res.status(500).json({ message: "Failed to fetch class sessions" });
    }
  });

  // Get class statistics
  app.get("/api/classes/:id/stats", async (req: Request, res: Response) => {
    try {
      const classId = req.params.id;
      
      // Verify class exists
      const classData = await storage.getClass(classId);
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }

      // Get basic counts
      const students = await storage.getClassStudents(classId);
      const sessions = await storage.getAttendanceSessions();
      const classSessions = sessions.filter(s => s.classId === classId);

      // Calculate statistics
      const totalStudents = students.length;
      const totalSessions = classSessions.length;
      const completedSessions = classSessions.filter(s => s.status === 'completed').length;
      
      // Calculate average attendance if there are completed sessions
      let averageAttendance = 0;
      if (completedSessions > 0) {
        const totalRecognized = classSessions.reduce((sum, s) => sum + (s.totalStudentsRecognized || 0), 0);
        averageAttendance = totalStudents > 0 ? Math.round((totalRecognized / completedSessions / totalStudents) * 100) : 0;
      }

      // Calculate average confidence
      const avgConfidence = classSessions.length > 0
        ? Math.round(classSessions.reduce((sum, s) => sum + (s.averageConfidence || 0), 0) / classSessions.length * 100)
        : 0;

      const stats = {
        classInfo: {
          id: classData.id,
          name: classData.name,
          code: classData.code,
          isActive: classData.isActive
        },
        enrollment: {
          totalStudents,
          activeStudents: totalStudents // Assuming all enrolled students are active
        },
        sessions: {
          totalSessions,
          completedSessions,
          pendingSessions: totalSessions - completedSessions
        },
        attendance: {
          averageAttendance: `${averageAttendance}%`,
          averageConfidence: `${avgConfidence}%`
        },
        lastSession: classSessions.length > 0 ? classSessions[classSessions.length - 1].date : null
      };

      res.json(stats);
    } catch (error) {
      console.error("Class stats error:", error);
      res.status(500).json({ message: "Failed to fetch class statistics" });
    }
  });

  // Toggle class active status
  app.patch("/api/classes/:id/toggle-status", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const classId = req.params.id;
      
      const existingClass = await storage.getClass(classId);
      if (!existingClass) {
        return res.status(404).json({ message: "Class not found" });
      }

      const updatedClass = await storage.updateClass(classId, {
        isActive: !existingClass.isActive
      });

      if (!updatedClass) {
        return res.status(404).json({ message: "Failed to update class status" });
      }

      res.json({
        message: `Class ${updatedClass.isActive ? 'activated' : 'deactivated'} successfully`,
        class: {
          id: updatedClass.id,
          name: updatedClass.name,
          code: updatedClass.code,
          isActive: updatedClass.isActive
        }
      });
    } catch (error) {
      console.error("Toggle class status error:", error);
      res.status(500).json({ message: "Failed to toggle class status" });
    }
  });
}
   