import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  boolean,
  real,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/** ---------------- Users ---------------- */
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["admin", "teacher", "student"] })
    .notNull()
    .default("teacher"),
  email: text("email").unique(),
  isActive: boolean("is_active").notNull().default(true),
  forcePasswordChange: boolean("force_password_change").notNull().default(false),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

/** ---------------- Students ---------------- */
export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, {
    onDelete: "cascade",
  }),
  studentId: text("student_id").notNull().unique(), // Admission number
  rollNo: text("roll_no").notNull().unique(), // Roll No for login
  name: text("name").notNull(),
  email: text("email"),
  photos: jsonb("photos").$type<string[]>().default([]),
  embedding: jsonb("embedding").$type<number[]>(),
  isTrainingComplete: boolean("is_training_complete").default(false),
  yearLevel: integer("year_level").notNull(),
  program: text("program").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/** ---------------- Teachers ---------------- */
export const teachers = pgTable("teachers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  department: text("department"),
  employeeId: text("employee_id").unique(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

/** ---------------- Classes ---------------- */
export const classes = pgTable("classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  teacherId: varchar("teacher_id").references(() => teachers.id),
  schedule: text("schedule"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

/** ---------------- Class Enrollments ---------------- */
export const classEnrollments = pgTable("class_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").references(() => classes.id),
  studentId: varchar("student_id").references(() => students.id),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
});

/** ---------------- Attendance Sessions ---------------- */
export const attendanceSessions = pgTable("attendance_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").references(() => classes.id),
  date: timestamp("date").defaultNow(),
  totalImages: integer("total_images").default(0),
  totalFacesDetected: integer("total_faces_detected").default(0),
  totalStudentsRecognized: integer("total_students_recognized").default(0),
  averageConfidence: real("average_confidence").default(0),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

/** ---------------- Attendance Records ---------------- */
export const attendanceRecords = pgTable("attendance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => attendanceSessions.id),
  studentId: varchar("student_id").references(() => students.id),
  isPresent: boolean("is_present").default(true),
  confidence: real("confidence").default(0),
  detectionCount: integer("detection_count").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

/** ---------------- Recognition Results ---------------- */
export const recognitionResults = pgTable("recognition_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => attendanceSessions.id),
  studentId: varchar("student_id").references(() => students.id),
  confidence: real("confidence").notNull(),
  imageIndex: integer("image_index").notNull(),
  bbox: jsonb("bbox").$type<number[]>(),
  timestamp: timestamp("timestamp").defaultNow(),
});

/** ---------------- Invitations ---------------- */
export const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  role: text("role", { enum: ["admin", "teacher", "student"] }).notNull(),
  token: text("token").notNull().unique(),
  isUsed: boolean("is_used").default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/** ---------------- Insert Schemas ---------------- */
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  role: true,
  email: true,
});

export const insertStudentSchema = createInsertSchema(students).pick({
  name: true,
  studentId: true,
  rollNo: true,
  email: true,
  userId: true,
  yearLevel: true,
  program: true,
});

export const insertTeacherSchema = createInsertSchema(teachers).pick({
  userId: true,
  department: true,
  employeeId: true,
});

export const insertClassSchema = createInsertSchema(classes).pick({
  name: true,
  code: true,
  description: true,
  schedule: true,
  teacherId: true,
});

export const insertAttendanceSessionSchema =
  createInsertSchema(attendanceSessions).pick({
    classId: true,
    date: true,
  });

export const insertInvitationSchema = createInsertSchema(invitations).pick({
  email: true,
  role: true,
  token: true,
  expiresAt: true,
});

/** ---------------- Login Schemas ---------------- */
// Generic login (admin/teacher)
export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  role: z.enum(["admin", "teacher"]),
});

// Student login requires email + rollNo + password
export const studentLoginSchema = z.object({
  email: z.string().email(),
  rollNo: z.string().min(1),
  password: z.string().min(1),
});
export type StudentLoginRequest = z.infer<typeof studentLoginSchema>;

/** ---------------- Types ---------------- */
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type InsertTeacher = z.infer<typeof insertTeacherSchema>;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type InsertAttendanceSession = z.infer<
  typeof insertAttendanceSessionSchema
>;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;

export type User = typeof users.$inferSelect;
export type Teacher = typeof teachers.$inferSelect;
export type Student = typeof students.$inferSelect;
export type Class = typeof classes.$inferSelect;
export type ClassEnrollment = typeof classEnrollments.$inferSelect;
export type AttendanceSession = typeof attendanceSessions.$inferSelect;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type RecognitionResult = typeof recognitionResults.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;

export type UserWithProfile = User & { teacher?: Teacher; student?: Student };
