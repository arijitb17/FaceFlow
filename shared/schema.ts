import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("teacher"),
});

export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  studentId: text("student_id").notNull().unique(),
  email: text("email"),
  photos: jsonb("photos").$type<string[]>().default([]),
  embedding: jsonb("embedding").$type<number[]>(),
  isTrainingComplete: boolean("is_training_complete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const classes = pgTable("classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  teacherId: varchar("teacher_id").references(() => users.id),
  schedule: text("schedule"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const classEnrollments = pgTable("class_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").references(() => classes.id),
  studentId: varchar("student_id").references(() => students.id),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
});

export const attendanceSessions = pgTable("attendance_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").references(() => classes.id),
  date: timestamp("date").defaultNow(),
  totalImages: integer("total_images").default(0),
  totalFacesDetected: integer("total_faces_detected").default(0),
  totalStudentsRecognized: integer("total_students_recognized").default(0),
  averageConfidence: real("average_confidence").default(0),
  status: text("status").default("pending"), // pending, processing, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
});

export const attendanceRecords = pgTable("attendance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => attendanceSessions.id),
  studentId: varchar("student_id").references(() => students.id),
  isPresent: boolean("is_present").default(true),
  confidence: real("confidence").default(0),
  detectionCount: integer("detection_count").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const recognitionResults = pgTable("recognition_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => attendanceSessions.id),
  studentId: varchar("student_id").references(() => students.id),
  confidence: real("confidence").notNull(),
  imageIndex: integer("image_index").notNull(),
  bbox: jsonb("bbox").$type<number[]>(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  role: true,
});

export const insertStudentSchema = createInsertSchema(students).pick({
  name: true,
  studentId: true,
  email: true,
});

export const insertClassSchema = createInsertSchema(classes).pick({
  name: true,
  code: true,
  description: true,
  schedule: true,
});

export const insertAttendanceSessionSchema = createInsertSchema(attendanceSessions).pick({
  classId: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type Class = typeof classes.$inferSelect;
export type ClassEnrollment = typeof classEnrollments.$inferSelect;
export type AttendanceSession = typeof attendanceSessions.$inferSelect;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type RecognitionResult = typeof recognitionResults.$inferSelect;
export type InsertAttendanceSession = z.infer<typeof insertAttendanceSessionSchema>;
