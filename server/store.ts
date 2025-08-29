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
  type InsertAttendanceSession
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserWithProfile(id: string): Promise<UserWithProfile | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<UserWithProfile[]>;
  getUsersByRole(role: string): Promise<UserWithProfile[]>;

  // Teacher methods
  createTeacher(teacher: InsertTeacher): Promise<Teacher>;
  getTeachers(): Promise<Teacher[]>;
  getTeacher(userId: string): Promise<Teacher | undefined>;

  // Student methods
  getStudents(): Promise<(Student & { user: User })[]>;
  getStudent(id: string): Promise<Student | undefined>;
  getStudentByStudentId(studentId: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, updates: Partial<Student>): Promise<Student | undefined>;
  deleteStudent(id: string): Promise<boolean>;

  // Classes
  getClasses(): Promise<Class[]>;
  getClass(id: string): Promise<Class | undefined>;
  createClass(classData: InsertClass & { teacherId?: string }): Promise<Class>;
  updateClass(id: string, updates: Partial<Class>): Promise<Class | undefined>;
  deleteClass(id: string): Promise<boolean>;
  getClassStudents(classId: string): Promise<Student[]>;
  enrollStudent(classId: string, studentId: string): Promise<ClassEnrollment>;
  unenrollStudent(classId: string, studentId: string): Promise<boolean>;

  // Attendance
  getAttendanceSessions(): Promise<AttendanceSession[]>;
  getAttendanceSession(id: string): Promise<AttendanceSession | undefined>;
  createAttendanceSession(session: InsertAttendanceSession): Promise<AttendanceSession>;
  updateAttendanceSession(id: string, updates: Partial<AttendanceSession>): Promise<AttendanceSession | undefined>;
  getAttendanceRecords(sessionId: string): Promise<AttendanceRecord[]>;
  createAttendanceRecord(record: Omit<AttendanceRecord, 'id' | 'createdAt'>): Promise<AttendanceRecord>;

  // Recognition
  createRecognitionResult(result: Omit<RecognitionResult, 'id' | 'timestamp'>): Promise<RecognitionResult>;
  getRecognitionResults(sessionId: string): Promise<RecognitionResult[]>;

  // Authentication
  validateCredentials(username: string, password: string, role: string): Promise<User | null>;
  updateLastLogin(userId: string): Promise<void>;
}