import {
  type User,
  type InsertUser,
  type Teacher,
  type InsertTeacher,
  type Student,
  type InsertStudent,
  type UserWithProfile,
  type Class,
  type InsertClass,
  type ClassEnrollment,
  type AttendanceSession,
  type AttendanceRecord,
  type RecognitionResult,
  type InsertAttendanceSession,
  users,
  teachers,
  students,
  classes,
  classEnrollments,
  attendanceSessions,
  attendanceRecords,
  recognitionResults,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and,or } from "drizzle-orm";
import bcrypt from "bcrypt";
import type { IStorage } from "./store";
import { inArray } from "drizzle-orm";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export class PgStorage implements IStorage {
  constructor() {
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    try {
      // Check if admin already exists
      const existingAdmin = await db
        .select()
        .from(users)
        .where(eq(users.username, "admin"))
        .limit(1);

      if (existingAdmin.length > 0) {
        console.log("Default data already exists, skipping initialization");
        return;
      }

      console.log("Initializing default data...");

      // Create admin user
      const [adminUser] = await db
        .insert(users)
        .values({
          username: "admin",
          password: await bcrypt.hash("admin123", 10),
          role: "admin",
          email: "admin@smartattend.edu",
          name: "System Administrator",
          isActive: true,
          forcePasswordChange: false,
        })
        .returning();

      // Create teacher user
      const [teacherUser] = await db
        .insert(users)
        .values({
          username: "teacher",
          password: await bcrypt.hash("teacher123", 10),
          role: "teacher",
          email: "teacher@smartattend.edu",
          name: "Demo Teacher",
          isActive: true,
          forcePasswordChange: false,
        })
        .returning();

      // Create teacher profile
      await db.insert(teachers).values({
        userId: teacherUser.id,
        department: "Computer Science",
        employeeId: "T-1001",
      });

      // Create student user
      const [studentUser] = await db
        .insert(users)
        .values({
          username: "student",
          password: await bcrypt.hash("student123", 10),
          role: "student",
          email: "student@smartattend.edu",
          name: "Demo Student",
          isActive: true,
          forcePasswordChange: false,
        })
        .returning();

      // Create student profile
      await db.insert(students).values({
        userId: studentUser.id,
        studentId: "S-1001",
        rollNo: "R-0001",
        name: "Demo Student",
        email: "student@smartattend.edu",
        photos: [],
        embedding: null,
        isTrainingComplete: false,
        yearLevel: 1,
        program: "Computer Science",
      });

      console.log("Default data initialized successfully");
    } catch (error) {
      console.error("Error initializing default data:", error);
    }
  }
async updateProfile(userId: string, updates: Partial<User> & Partial<Student>) {
  let updatedUser: User | undefined;
  let updatedStudent: Student | undefined;

  // Update users table (only valid columns)
  const userUpdates: Partial<User> = {};
  if (updates.name) userUpdates.name = updates.name;
  if (updates.email) userUpdates.email = updates.email;
  if (Object.keys(userUpdates).length > 0) {
    [updatedUser] = await db.update(users).set(userUpdates).where(eq(users.id, userId)).returning();
  }

  // Update students table (only valid columns)
  const studentUpdates: Partial<Student> = {};
  if (updates.program) studentUpdates.program = updates.program;
  if (updates.yearLevel) studentUpdates.yearLevel = updates.yearLevel;
  if (updates.rollNo) studentUpdates.rollNo = updates.rollNo;
  if (Object.keys(studentUpdates).length > 0) {
    [updatedStudent] = await db.update(students).set(studentUpdates).where(eq(students.userId, userId)).returning();
  }

  return {
    ...updatedUser,
    student: updatedStudent,
  };
}

  // ---------------- USERS ----------------
  async getUser(id: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return result[0];
  }

  async getUserWithProfile(id: string): Promise<UserWithProfile | undefined> {
  const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user[0]) return undefined;

  const profile: UserWithProfile = { ...user[0] };

  if (user[0].role === "teacher") {
    const teacherResult = await db.select().from(teachers).where(eq(teachers.userId, id)).limit(1);
    profile.teacher = teacherResult[0];
  } else if (user[0].role === "student") {
    const studentResult = await db.select().from(students).where(eq(students.userId, id)).limit(1);
    profile.student = studentResult[0];
  }

  return profile;
}


  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);

    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
      })
      .returning();

    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(eq(users.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getAllUsers(): Promise<UserWithProfile[]> {
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(users.createdAt);

    const result: UserWithProfile[] = [];

    for (const user of allUsers) {
      const profile: UserWithProfile = { ...user };

      if (user.role === "teacher") {
        const teacherResult = await db
          .select()
          .from(teachers)
          .where(eq(teachers.userId, user.id))
          .limit(1);
        profile.teacher = teacherResult[0];
      } else if (user.role === "student") {
        const studentResult = await db
          .select()
          .from(students)
          .where(eq(students.userId, user.id))
          .limit(1);
        profile.student = studentResult[0];
      }

      result.push(profile);
    }

    return result;
  }
// Add this method to your PgStorage class in storage.ts

async getUsersByRole(role: "admin" | "teacher" | "student"): Promise<UserWithProfile[]> {
  const roleUsers = await db
    .select()
    .from(users)
    .where(eq(users.role, role))
    .orderBy(users.createdAt);

  const result: UserWithProfile[] = [];

  for (const user of roleUsers) {
    const profile: UserWithProfile = { ...user };

    if (role === "teacher") {
      const teacherResult = await db
        .select()
        .from(teachers)
        .where(eq(teachers.userId, user.id))
        .limit(1);
      profile.teacher = teacherResult[0];
    } else if (role === "student") {
      const studentResult = await db
        .select()
        .from(students)
        .where(eq(students.userId, user.id))
        .limit(1);
      profile.student = studentResult[0];
    }

    result.push(profile);
  }

  return result;
}
// ---------------- REPORTS ----------------
async getTeacherReport(userId: string): Promise<{
  teacher: Teacher;
  classes: (Class & { students: (Student & { user: User })[]; sessions: (AttendanceSession & { recognitionResults: RecognitionResult[] })[] })[];
} | null> {
  const teacher = await this.getTeacher(userId);
  if (!teacher) return null;

  const classes = await this.getClassesByTeacher(userId);

  const detailedClasses = await Promise.all(classes.map(async (cls) => {
    const students = await this.getClassStudents(cls.id);
    const sessions = await this.getAttendanceSessionsByTeacher(userId)
      .then(sessionsForTeacher => sessionsForTeacher.filter(s => s.classId === cls.id))
      .then(async sessionsForClass => {
        return Promise.all(sessionsForClass.map(async (session) => {
          const recognitionResults = await this.getRecognitionResults(session.id);
          return { ...session, recognitionResults };
        }));
      });

    return { ...cls, students, sessions };
  }));

  return { teacher, classes: detailedClasses };
}

async getClassesByTeacher(userId: string): Promise<Class[]> {
  // Get teacher record using userId
  const teacher = await db
    .select()
    .from(teachers)
    .where(eq(teachers.userId, userId))
    .limit(1);

  if (!teacher[0]) return [];

  // Get classes taught by this teacher
  const teacherClasses = await db
    .select()
    .from(classes)
    .where(eq(classes.teacherId, teacher[0].id));

  return teacherClasses;
}
async getStudentsByTeacherViaClasses(userId: string): Promise<(Student & { user: User })[]> {
  // 1. Get teacher record using userId
  const teacher = await db
    .select()
    .from(teachers)
    .where(eq(teachers.userId, userId))
    .limit(1);

  if (!teacher[0]) return [];
  const teacherId = teacher[0].id;

  // 2. Get classes taught by this teacher
  const teacherClasses = await db
    .select()
    .from(classes)
    .where(eq(classes.teacherId, teacherId));
  
  if (!teacherClasses.length) return [];

  const classIds = teacherClasses.map(c => c.id);

  // 3. Get enrolled students + their linked user data
  const enrollments = await db
    .select({ 
      student: students, 
      user: users,
      enrollment: classEnrollments 
    })
    .from(classEnrollments)
    .innerJoin(students, eq(classEnrollments.studentId, students.id))
    .innerJoin(users, eq(students.userId, users.id))
    .where(inArray(classEnrollments.classId, classIds));

  // 4. Remove duplicates (student might be in multiple classes)
  const uniqueStudents = new Map();
  for (const enrollment of enrollments) {
    const studentId = enrollment.student.id;
    if (!uniqueStudents.has(studentId)) {
      uniqueStudents.set(studentId, {
        ...enrollment.student,
        user: enrollment.user,
        isTrainingComplete: enrollment.student.isTrainingComplete ?? false,
      });
    }
  }

  return Array.from(uniqueStudents.values());
}



  // ---------------- TEACHERS ----------------
  async createTeacher(insertTeacher: InsertTeacher): Promise<Teacher> {
    const [teacher] = await db
      .insert(teachers)
      .values(insertTeacher)
      .returning();
    return teacher;
  }

  async getTeachers(): Promise<Teacher[]> {
    return await db.select().from(teachers);
  }

  async getTeacher(userId: string): Promise<Teacher | undefined> {
    const result = await db
      .select()
      .from(teachers)
      .where(eq(teachers.userId, userId))
      .limit(1);
    return result[0];
  }

  // ---------------- STUDENTS ----------------
async getStudents(): Promise<(Student & { user: User })[]> {
  const rows = await db
    .select({ student: students, user: users })
    .from(students)
    .innerJoin(users, eq(students.userId, users.id));

  return rows.map(r => ({
    ...r.student,
    user: r.user,
    isTrainingComplete: r.student.isTrainingComplete ?? false,
  }));
}



async getStudent(idOrUserId: string): Promise<Student | undefined> {
  const result = await db
    .select()
    .from(students)
    .where(
      or(
        eq(students.id, idOrUserId),
        eq(students.userId, idOrUserId)
      )
    )
    .limit(1);
  return result[0];
}


  async getStudentByStudentId(studentId: string): Promise<Student | undefined> {
    const result = await db
      .select()
      .from(students)
      .where(eq(students.studentId, studentId))
      .limit(1);
    return result[0];
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
  const [student] = await db.insert(students).values(insertStudent).returning();
  return student;
}

async updateStudent(id: string, updates: Partial<Student>): Promise<Student | undefined> {
  const [updated] = await db.update(students).set(updates).where(eq(students.id, id)).returning();
  return updated;
}


  async deleteStudent(id: string): Promise<boolean> {
    const result = await db
      .delete(students)
      .where(eq(students.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // ---------------- CLASSES ----------------
  async getClasses(): Promise<Class[]> {
    return await db.select().from(classes);
  }

  async getClass(id: string): Promise<Class | undefined> {
    const result = await db
      .select()
      .from(classes)
      .where(eq(classes.id, id))
      .limit(1);
    return result[0];
  }
async markStudentsAsTrained(studentIds: string[]): Promise<void> {
  if (!studentIds || studentIds.length === 0) return;

  await db
    .update(students)
    .set({ isTrainingComplete: true })
    .where(inArray(students.id, studentIds));
}


  async createClass(classData: InsertClass & { teacherId?: string }): Promise<Class> {
    const [cls] = await db
      .insert(classes)
      .values(classData)
      .returning();
    return cls;
  }

  async updateClass(id: string, updates: Partial<Class>): Promise<Class | undefined> {
    const [updated] = await db
      .update(classes)
      .set(updates)
      .where(eq(classes.id, id))
      .returning();
    return updated;
  }

  async deleteClass(id: string): Promise<boolean> {
    const result = await db
      .delete(classes)
      .where(eq(classes.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

async getClassStudents(classId: string): Promise<(Student & { user: User })[]> {
  const enrollments = await db
    .select({ student: students, user: users })
    .from(classEnrollments)
    .innerJoin(students, eq(classEnrollments.studentId, students.id))
    .innerJoin(users, eq(students.userId, users.id))
    .where(eq(classEnrollments.classId, classId));

  return enrollments.map(r => ({
    ...r.student,
    user: r.user,
    isTrainingComplete: r.student.isTrainingComplete ?? false,
  }));
}


  async enrollStudent(classId: string, studentId: string): Promise<ClassEnrollment> {
    const [enrollment] = await db
      .insert(classEnrollments)
      .values({
        classId,
        studentId,
      })
      .returning();
    return enrollment;
  }

  async unenrollStudent(classId: string, studentId: string): Promise<boolean> {
    const result = await db
      .delete(classEnrollments)
      .where(
        and(
          eq(classEnrollments.classId, classId),
          eq(classEnrollments.studentId, studentId)
        )
      );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // ---------------- ATTENDANCE ----------------
  async getAttendanceSessions(): Promise<AttendanceSession[]> {
    return await db.select().from(attendanceSessions);
  }

  async getAttendanceSession(id: string): Promise<AttendanceSession | undefined> {
    const result = await db
      .select()
      .from(attendanceSessions)
      .where(eq(attendanceSessions.id, id))
      .limit(1);
    return result[0];
  }

  async createAttendanceSession(session: InsertAttendanceSession): Promise<AttendanceSession> {
    const [newSession] = await db
      .insert(attendanceSessions)
      .values(session)
      .returning();
    return newSession;
  }

  async updateAttendanceSession(id: string, updates: Partial<AttendanceSession>): Promise<AttendanceSession | undefined> {
    const [updated] = await db
      .update(attendanceSessions)
      .set(updates)
      .where(eq(attendanceSessions.id, id))
      .returning();
    return updated;
  }

  async getAttendanceRecords(sessionId: string): Promise<AttendanceRecord[]> {
    return await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.sessionId, sessionId));
  }

  async createAttendanceRecord(record: Omit<AttendanceRecord, 'id' | 'createdAt'>): Promise<AttendanceRecord> {
    const [newRecord] = await db
      .insert(attendanceRecords)
      .values(record)
      .returning();
    return newRecord;
  }

  // ---------------- RECOGNITION ----------------
  async createRecognitionResult(result: Omit<RecognitionResult, 'id' | 'timestamp'>): Promise<RecognitionResult> {
    const [newResult] = await db
      .insert(recognitionResults)
      .values(result)
      .returning();
    return newResult;
  }

  async getRecognitionResults(sessionId: string): Promise<RecognitionResult[]> {
    return await db
      .select()
      .from(recognitionResults)
      .where(eq(recognitionResults.sessionId, sessionId));
  }
async getAttendanceSessionsByTeacher(userId: string): Promise<AttendanceSession[]> {
  const teacher = await db
    .select()
    .from(teachers)
    .where(eq(teachers.userId, userId))
    .limit(1);

  if (!teacher[0]) return [];

  const teacherClasses = await db
    .select()
    .from(classes)
    .where(eq(classes.teacherId, teacher[0].id));

  if (!teacherClasses.length) return [];

  const classIds = teacherClasses.map(c => c.id);

  const sessions = await db
    .select()
    .from(attendanceSessions)
    .where(inArray(attendanceSessions.classId, classIds));

  return sessions;
}
  // ---------------- AUTH ----------------
  async validateCredentials(username: string, password: string, role: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user || user.role !== role || !user.isActive) return null;

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  async updateLastLogin(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, userId));
  }
}

export const storage = new PgStorage();