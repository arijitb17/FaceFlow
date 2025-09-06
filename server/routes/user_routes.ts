// routes/users.ts
import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken, requireAdmin } from "./auth_routes";
import { randomBytes } from "crypto";
import { sendInviteEmail } from "../utils/mail";
import bcrypt from "bcryptjs";

interface AuthRequest extends Request {
  user?: { userId: string; username: string; role: string };
}

// -------------------
// Helper Functions
// -------------------
const generateUsername = (role: string, name: string) => {
  const cleanName = name.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, ".");
  const suffix = role === "teacher" ? ".teacher" : role === "admin" ? ".admin" : "";
  return cleanName + suffix;
};

const generatePassword = (role: string) => {
  const prefix = role === "teacher" ? "TMP" : role === "student" ? "STU" : "ADM";
  const random = randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${random}`;
};

const generateStudentId = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 99999).toString().padStart(5, "0");
  return `STU${year}${random}`;
};

const generateRollNo = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
  return `${year}${random}`;
};

const generateEmployeeId = () => {
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
  return `T-${random}`;
};

export function registerUserRoutes(app: Express) {
  // -------------------
  // Get all users
  // -------------------
  app.get("/api/users", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { role, status } = req.query;

      let users;
      if (role && role !== "all") {
        users = await storage.getUsersByRole(role as "admin" | "teacher" | "student");
      } else {
        users = await storage.getAllUsers();
      }

      // Filter by status if specified
      if (status && status !== "all") {
        users = users.filter((user) => {
          if (status === "active") return user.isActive;
          if (status === "inactive") return !user.isActive;
          if (status === "pending") return !user.isActive;
          return true;
        });
      }

      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // -------------------
  // Delete User
  // -------------------
  app.delete("/api/users/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role === "admin") {
        return res.status(403).json({ message: "Cannot delete admin users" });
      }

      const deleted = await storage.deleteUser(userId);

      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // -------------------
  // Update User (Admin Only)
  // -------------------
  app.patch("/api/users/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const { isActive, name, email, password } = req.body;

      const updates: any = {};
      if (typeof isActive === "boolean") updates.isActive = isActive;
      if (name) updates.name = name;
      if (email) updates.email = email;
      if (password) updates.password = await bcrypt.hash(password, 10);

      const updatedUser = await storage.updateUser(userId, updates);

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // -------------------
  // Create Admin
  // -------------------
  app.post("/api/users/admin", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { name, email, username, sendEmail = true } = req.body;

      if (!name || !email || !username) {
        return res.status(400).json({ message: "Name, email, and username are required" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const password = generatePassword("admin");
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await storage.createUser({
        username,
        password: hashedPassword,
        name,
        role: "admin",
        email,
      });

      if (sendEmail) {
        await sendInviteEmail(
          email,
          "Admin Account Created",
          `
            <h2>Welcome, ${name}!</h2>
            <p>Your admin account has been created.</p>
            <p><b>Username:</b> ${username}<br/><b>Password:</b> ${password}</p>
            <p>Please change your password after first login.</p>
          `
        );
      }

      const { password: _, ...safeUser } = user;
      res.status(201).json({
        user: safeUser,
        credentials: { username, password },
      });
    } catch (error) {
      console.error("Create admin error:", error);
      res.status(500).json({ message: "Failed to create admin" });
    }
  });

  // -------------------
  // Create Teacher
  // -------------------
  app.post("/api/users/teacher", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { name, email, department, sendEmail = true } = req.body;

      if (!name || !email || !department) {
        return res.status(400).json({ message: "Name, email, and department are required" });
      }

      const username = generateUsername("teacher", name);
      const password = generatePassword("teacher");
      const hashedPassword = await bcrypt.hash(password, 10);
      const employeeId = generateEmployeeId();

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Generated username already exists" });
      }

      const user = await storage.createUser({
        username,
        password: hashedPassword,
        name,
        role: "teacher",
        email,
      });

      const teacher = await storage.createTeacher({
        userId: user.id,
        department,
        employeeId,
      });

      if (sendEmail) {
        await sendInviteEmail(
          email,
          "Teacher Account Created",
          `
            <h2>Welcome, ${name}!</h2>
            <p>Your teacher account has been created.</p>
            <p><b>Username:</b> ${username}<br/><b>Password:</b> ${password}</p>
            <p><b>Employee ID:</b> ${employeeId}</p>
            <p>Please change your password after first login.</p>
          `
        );
      }

      const { password: _, ...safeUser } = user;
      res.status(201).json({
        user: safeUser,
        teacher,
        credentials: { username, password },
      });
    } catch (error) {
      console.error("Create teacher error:", error);
      res.status(500).json({ message: "Failed to create teacher" });
    }
  });

  // -------------------
  // Create Student
  // -------------------
  app.post("/api/users/student", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { name, email, yearLevel, program, sendEmail = true } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }

      const studentId = generateStudentId();
      const rollNo = generateRollNo();
      const username = studentId;
      const password = generatePassword("student");
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await storage.createUser({
        username,
        password: hashedPassword,
        name,
        role: "student",
        email: email || null,
      });

      const student = await storage.createStudent({
        userId: user.id,
        studentId,
        rollNo,
        name,
        email: email || null,
        yearLevel: yearLevel || 1,
        program: program || "General Studies",
      });

      if (sendEmail && email) {
        await sendInviteEmail(
          email,
          "Student Account Created",
          `
            <h2>Welcome, ${name}!</h2>
            <p>Your student account has been created.</p>
            <p><b>Student ID:</b> ${studentId}<br/><b>Roll No:</b> ${rollNo}<br/><b>Password:</b> ${password}</p>
            <p>Use your email and roll number to log in.</p>
          `
        );
      }

      const { password: _, ...safeUser } = user;
      res.status(201).json({
        user: safeUser,
        student,
        credentials: { studentId, password },
      });
    } catch (error) {
      console.error("Create student error:", error);
      res.status(500).json({ message: "Failed to create student" });
    }
  });

  // -------------------
  // Send credentials
  // -------------------
  app.post("/api/users/send-credentials", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userIds, message } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: "User IDs are required" });
      }

      const results = [];

      for (const userId of userIds) {
        try {
          const userWithProfile = await storage.getUserWithProfile(userId);
          if (!userWithProfile || !userWithProfile.email) {
            results.push({ userId, success: false, error: "User not found or no email" });
            continue;
          }

          let credentials = "";
          if (userWithProfile.role === "student" && userWithProfile.student) {
            credentials = `Student ID: ${userWithProfile.student.studentId}, Roll No: ${userWithProfile.student.rollNo}`;
          } else {
            credentials = `Username: ${userWithProfile.username}`;
          }

          await sendInviteEmail(
            userWithProfile.email,
            "Account Credentials",
            `
              <h2>Hello, ${userWithProfile.name}!</h2>
              <p>Your account credentials:</p>
              <p>${credentials}</p>
              ${message ? `<p>Additional message: ${message}</p>` : ""}
              <p>Please contact support if you need password reset.</p>
            `
          );

          results.push({ userId, success: true });
        } catch (error) {
          results.push({ userId, success: false });
        }
      }

      res.json({ results });
    } catch (error) {
      console.error("Send credentials error:", error);
      res.status(500).json({ message: "Failed to send credentials" });
    }
  });
}
