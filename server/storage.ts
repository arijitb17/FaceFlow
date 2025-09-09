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
import { eq, and, or, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";
import type { IStorage } from "./store";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export class PgStorage implements IStorage {
  constructor() {
    // Removed initializeDefaultData()
  }

  // Helper method for consistent username normalization
  private normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
  }

  // Helper method for consistent email normalization
  private normalizeEmail(email?: string | null): string | null {
    return email ? email.trim().toLowerCase() : null;
  }

  // ---------------- PROFILE ----------------
  async updateProfile(
    userId: string,
    updates: Partial<User & Student>
  ): Promise<UserWithProfile | null> {
    const userUpdates: Partial<User> = {};
    if (updates.name !== undefined) userUpdates.name = updates.name;
    if (updates.email !== undefined) userUpdates.email = this.normalizeEmail(updates.email);
    if (updates.password !== undefined) userUpdates.password = updates.password;
    if (updates.isActive !== undefined) userUpdates.isActive = updates.isActive;

    let user: User | null = null;

    if (Object.keys(userUpdates).length > 0) {
      const updatedUsers = await db
        .update(users)
        .set(userUpdates)
        .where(eq(users.id, userId))
        .returning();

      user = updatedUsers[0] ?? null;
    } else {
      user = (await this.getUser(userId)) ?? null;
    }

    if (!user) return null;

    if (user.role === "student") {
      const studentUpdates: Partial<Student> = {};
      if (updates.program !== undefined) studentUpdates.program = updates.program;
      if (updates.yearLevel !== undefined)
        studentUpdates.yearLevel = updates.yearLevel;
      if (updates.rollNo !== undefined) studentUpdates.rollNo = updates.rollNo;

      if (Object.keys(studentUpdates).length > 0) {
        await db
          .update(students)
          .set(studentUpdates)
          .where(eq(students.userId, userId));
      }
    }

    return (await this.getUserWithProfile(userId)) ?? null;
  }

  // ---------------- USERS ----------------
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const normalizedUsername = this.normalizeUsername(username);
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, normalizedUsername))
      .limit(1);
    return result[0];
  }

  async getUserWithProfile(id: string): Promise<UserWithProfile | undefined> {
    const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user[0]) return undefined;

    const profile: UserWithProfile = { ...user[0] };

    if (user[0].role === "teacher") {
      const teacherResult = await db
        .select()
        .from(teachers)
        .where(eq(teachers.userId, id))
        .limit(1);
      profile.teacher = teacherResult[0];
    } else if (user[0].role === "student") {
      const studentResult = await db
        .select()
        .from(students)
        .where(eq(students.userId, id))
        .limit(1);
      profile.student = studentResult[0];
    }

    return profile;
  }

  // ---------------- AUTH ----------------

  // Fixed createUser method with consistent normalization
  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash password
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);

    // Normalize inputs consistently
    const normalizedUsername = this.normalizeUsername(insertUser.username);
    const normalizedEmail = this.normalizeEmail(insertUser.email);

    console.log("Creating user with normalized data:", {
      username: normalizedUsername,
      email: normalizedEmail,
      role: insertUser.role
    });

    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        username: normalizedUsername,
        email: normalizedEmail,
        password: hashedPassword,
        role: insertUser.role || "teacher", // Default to teacher if undefined
        isActive: true, // ensure the new user is active
      })
      .returning();

    return user;
  }

  async validateCredentials(
    identifier: string,
    password: string,
    role: "admin" | "teacher" | "student",
    rollNo?: string // only for student login
  ) {
    let user: User | undefined;

    console.log("Validating credentials for:", {
      identifier,
      role,
      rollNo: rollNo || "N/A"
    });

   if (role === "student") {
  if (!rollNo) {
    console.log("No roll number provided for student login");
    return null;
  }

  const normalizedEmail = this.normalizeEmail(identifier);
  if (!normalizedEmail) {
    console.log("Invalid email format");
    return null;
  }

  const studentResult = await db
    .select({ student: students, user: users })
    .from(students)
    .innerJoin(users, eq(students.userId, users.id))
    .where(
      and(
        eq(students.email, normalizedEmail), // guaranteed string
        eq(students.rollNo, rollNo.trim())  // also guaranteed string
      )
    )
    .limit(1);

  console.log("Student lookup result:", studentResult.length > 0 ? "Found" : "Not found");

  if (!studentResult[0]) return null;
  user = studentResult[0].user;
}
else {
      // For admin/teacher, lookup by username
      const normalizedUsername = this.normalizeUsername(identifier);
      user = await this.getUserByUsername(normalizedUsername);
      
      console.log("Admin/Teacher lookup result:", user ? "Found" : "Not found");
    }

    if (!user) {
      console.log("User not found");
      return null;
    }
    
    // Normalize role comparison
    const userRole = user.role.toLowerCase();
    const expectedRole = role.toLowerCase();
    
    if (userRole !== expectedRole) {
      console.log("Role mismatch:", userRole, "vs expected", expectedRole);
      return null;
    }
    
    if (!user.isActive) {
      console.log("Inactive user");
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    console.log("Password validation:", isValid ? "Valid" : "Invalid");
    
    return isValid ? user : null;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    // Normalize email if provided
    if (updates.email !== undefined) {
      updates.email = this.normalizeEmail(updates.email);
    }
    
    // Normalize username if provided
    if (updates.username !== undefined) {
      updates.username = this.normalizeUsername(updates.username);
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getAllUsers(): Promise<UserWithProfile[]> {
    const allUsers = await db.select().from(users).orderBy(users.createdAt);

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

  async getUsersByRole(
    role: "admin" | "teacher" | "student"
  ): Promise<UserWithProfile[]> {
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
    classes: (Class & {
      students: (Student & { user: User })[];
      sessions: (AttendanceSession & {
        recognitionResults: RecognitionResult[];
      })[];
    })[];
  } | null> {
    const teacher = await this.getTeacher(userId);
    if (!teacher) return null;

    const classes = await this.getClassesByTeacher(userId);

    const detailedClasses = await Promise.all(
      classes.map(async (cls) => {
        const students = await this.getClassStudents(cls.id);
        const sessions = await this.getAttendanceSessionsByTeacher(userId)
          .then((sessionsForTeacher) =>
            sessionsForTeacher.filter((s) => s.classId === cls.id)
          )
          .then(async (sessionsForClass) => {
            return Promise.all(
              sessionsForClass.map(async (session) => {
                const recognitionResults = await this.getRecognitionResults(
                  session.id
                );
                return { ...session, recognitionResults };
              })
            );
          });

        return { ...cls, students, sessions };
      })
    );

    return { teacher, classes: detailedClasses };
  }

  async getClassesByTeacher(userId: string): Promise<Class[]> {
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

    return teacherClasses;
  }

  async getStudentsByTeacherViaClasses(
    userId: string
  ): Promise<(Student & { user: User })[]> {
    const teacher = await db
      .select()
      .from(teachers)
      .where(eq(teachers.userId, userId))
      .limit(1);

    if (!teacher[0]) return [];
    const teacherId = teacher[0].id;

    const teacherClasses = await db
      .select()
      .from(classes)
      .where(eq(classes.teacherId, teacherId));

    if (!teacherClasses.length) return [];

    const classIds = teacherClasses.map((c) => c.id);

    const enrollments = await db
      .select({
        student: students,
        user: users,
        enrollment: classEnrollments,
      })
      .from(classEnrollments)
      .innerJoin(students, eq(classEnrollments.studentId, students.id))
      .innerJoin(users, eq(students.userId, users.id))
      .where(inArray(classEnrollments.classId, classIds));

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
    const [teacher] = await db.insert(teachers).values(insertTeacher).returning();
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

    return rows.map((r) => ({
      ...r.student,
      user: r.user,
      isTrainingComplete: r.student.isTrainingComplete ?? false,
    }));
  }

  async getStudent(idOrUserId: string): Promise<Student | undefined> {
    const result = await db
      .select()
      .from(students)
      .where(or(eq(students.id, idOrUserId), eq(students.userId, idOrUserId)))
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
    // Normalize email for student
    const normalizedStudent = {
      ...insertStudent,
      email: this.normalizeEmail(insertStudent.email),
    };

    const [student] = await db
      .insert(students)
      .values(normalizedStudent)
      .returning();
    return student;
  }

  async updateStudent(
    id: string,
    updates: Partial<Student>
  ): Promise<Student | undefined> {
    // Normalize email if provided
    if (updates.email !== undefined) {
      updates.email = this.normalizeEmail(updates.email);
    }

    const [updated] = await db
      .update(students)
      .set(updates)
      .where(eq(students.id, id))
      .returning();
    return updated;
  }

  async deleteStudent(id: string): Promise<boolean> {
    const result = await db.delete(students).where(eq(students.id, id));
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

  async createClass(
    classData: InsertClass & { teacherId?: string }
  ): Promise<Class> {
    const [cls] = await db.insert(classes).values(classData).returning();
    return cls;
  }

  async updateClass(
    id: string,
    updates: Partial<Class>
  ): Promise<Class | undefined> {
    const [updated] = await db
      .update(classes)
      .set(updates)
      .where(eq(classes.id, id))
      .returning();
    return updated;
  }

  async deleteClass(id: string): Promise<boolean> {
    const result = await db.delete(classes).where(eq(classes.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getClassStudents(
    classId: string
  ): Promise<(Student & { user: User })[]> {
    const enrollments = await db
      .select({ student: students, user: users })
      .from(classEnrollments)
      .innerJoin(students, eq(classEnrollments.studentId, students.id))
      .innerJoin(users, eq(students.userId, users.id))
      .where(eq(classEnrollments.classId, classId));

    return enrollments.map((r) => ({
      ...r.student,
      user: r.user,
      isTrainingComplete: r.student.isTrainingComplete ?? false,
    }));
  }

async enrollStudent(classId: string, studentId: string): Promise<ClassEnrollment> {
  console.log("Storage: enrollStudent called", { classId, studentId });
  
  // Validate inputs
  if (!classId || !studentId) {
    throw new Error("Class ID and Student ID are required");
  }

  // Check if class exists
  const classExists = await this.getClass(classId);
  if (!classExists) {
    throw new Error("Class not found");
  }

  // Check if student exists  
  const studentExists = await this.getStudent(studentId);
  if (!studentExists) {
    throw new Error("Student not found");
  }

  // Check if already enrolled
  const existingEnrollment = await db
    .select()
    .from(classEnrollments)
    .where(
      and(
        eq(classEnrollments.classId, classId),
        eq(classEnrollments.studentId, studentId)
      )
    )
    .limit(1);

  if (existingEnrollment.length > 0) {
    throw new Error("Student is already enrolled in this class");
  }

  try {
    const [enrollment] = await db
      .insert(classEnrollments)
      .values({
        classId,
        studentId,
      })
      .returning();
    
    console.log("Storage: enrollment created", enrollment);
    return enrollment;
  } catch (dbError: any) {
    console.error("Database error during enrollment:", dbError);
    
    if (dbError.code === '23505') { // Unique constraint violation
      throw new Error("Student is already enrolled in this class");
    }
    
    throw new Error(`Database error: ${dbError.message}`);
  }
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

  async getAttendanceSession(
    id: string
  ): Promise<AttendanceSession | undefined> {
    const result = await db
      .select()
      .from(attendanceSessions)
      .where(eq(attendanceSessions.id, id))
      .limit(1);
    return result[0];
  }

  async createAttendanceSession(
    session: InsertAttendanceSession
  ): Promise<AttendanceSession> {
    const [newSession] = await db
      .insert(attendanceSessions)
      .values(session)
      .returning();
    return newSession;
  }

  async updateAttendanceSession(
    id: string,
    updates: Partial<AttendanceSession>
  ): Promise<AttendanceSession | undefined> {
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

  async createAttendanceRecord(
    record: Omit<AttendanceRecord, "id" | "createdAt">
  ): Promise<AttendanceRecord> {
    const [newRecord] = await db
      .insert(attendanceRecords)
      .values(record)
      .returning();
    return newRecord;
  }

  // ---------------- RECOGNITION ----------------
  async createRecognitionResult(
    result: Omit<RecognitionResult, "id" | "timestamp">
  ): Promise<RecognitionResult> {
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

  async getAttendanceSessionsByTeacher(
    userId: string
  ): Promise<AttendanceSession[]> {
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

    const classIds = teacherClasses.map((c) => c.id);

    const sessions = await db
      .select()
      .from(attendanceSessions)
      .where(inArray(attendanceSessions.classId, classIds));

    return sessions;
  }

  // ---------------- AUTH ----------------

  async updateLastLogin(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, userId));
  }

  async deleteAttendanceSession(id: string): Promise<boolean> {
    const result = await db
      .delete(attendanceSessions)
      .where(eq(attendanceSessions.id, id));

    return result.rowCount ? result.rowCount > 0 : false;
  }
}

export const storage = new PgStorage();