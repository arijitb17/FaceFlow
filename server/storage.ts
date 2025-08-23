import { 
  type User, 
  type InsertUser, 
  type Student, 
  type InsertStudent,
  type Class,
  type InsertClass,
  type ClassEnrollment,
  type AttendanceSession,
  type AttendanceRecord,
  type RecognitionResult,
  type InsertAttendanceSession
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Students
  getStudents(): Promise<Student[]>;
  getStudent(id: string): Promise<Student | undefined>;
  getStudentByStudentId(studentId: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, updates: Partial<Student>): Promise<Student | undefined>;
  deleteStudent(id: string): Promise<boolean>;

  // Classes
  getClasses(): Promise<Class[]>;
  getClass(id: string): Promise<Class | undefined>;
  createClass(classData: InsertClass & { teacherId: string }): Promise<Class>;
  updateClass(id: string, updates: Partial<Class>): Promise<Class | undefined>;
  deleteClass(id: string): Promise<boolean>;

  // Class Enrollments
  getClassStudents(classId: string): Promise<Student[]>;
  enrollStudent(classId: string, studentId: string): Promise<ClassEnrollment>;
  unenrollStudent(classId: string, studentId: string): Promise<boolean>;

  // Attendance Sessions
  getAttendanceSessions(): Promise<AttendanceSession[]>;
  getAttendanceSession(id: string): Promise<AttendanceSession | undefined>;
  createAttendanceSession(session: InsertAttendanceSession): Promise<AttendanceSession>;
  updateAttendanceSession(id: string, updates: Partial<AttendanceSession>): Promise<AttendanceSession | undefined>;

  // Attendance Records
  getAttendanceRecords(sessionId: string): Promise<AttendanceRecord[]>;
  createAttendanceRecord(record: Omit<AttendanceRecord, 'id' | 'createdAt'>): Promise<AttendanceRecord>;

  // Recognition Results
  createRecognitionResult(result: Omit<RecognitionResult, 'id' | 'timestamp'>): Promise<RecognitionResult>;
  getRecognitionResults(sessionId: string): Promise<RecognitionResult[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private students: Map<string, Student> = new Map();
  private classes: Map<string, Class> = new Map();
  private classEnrollments: Map<string, ClassEnrollment> = new Map();
  private attendanceSessions: Map<string, AttendanceSession> = new Map();
  private attendanceRecords: Map<string, AttendanceRecord> = new Map();
  private recognitionResults: Map<string, RecognitionResult> = new Map();

  constructor() {
    // Create a default teacher user
    const defaultTeacher: User = {
      id: "teacher-1",
      username: "teacher",
      password: "password123",
      name: "Prof. Johnson",
      role: "teacher"
    };
    this.users.set(defaultTeacher.id, defaultTeacher);

    // Create some sample students
    const sampleStudents: Student[] = [
      {
        id: "student-1",
        name: "John Smith",
        studentId: "CS001",
        email: "john.smith@university.edu",
        photos: [],
        embedding: undefined,
        isTrainingComplete: false,
        createdAt: new Date()
      },
      {
        id: "student-2",
        name: "Emily Davis",
        studentId: "CS002",
        email: "emily.davis@university.edu",
        photos: [],
        embedding: undefined,
        isTrainingComplete: false,
        createdAt: new Date()
      },
      {
        id: "student-3",
        name: "Michael Johnson",
        studentId: "CS003",
        email: "michael.johnson@university.edu",
        photos: [],
        embedding: undefined,
        isTrainingComplete: false,
        createdAt: new Date()
      }
    ];

    sampleStudents.forEach(student => {
      this.students.set(student.id, student);
    });

    // Create sample classes
    const sampleClasses: Class[] = [
      {
        id: "class-1",
        name: "CS 101 - Intro to Programming",
        code: "CS101",
        description: "Introduction to computer programming concepts",
        teacherId: "teacher-1",
        schedule: "MWF 9:00-10:30 AM",
        isActive: true,
        createdAt: new Date()
      },
      {
        id: "class-2",
        name: "CS 201 - Data Structures",
        code: "CS201",
        description: "Advanced data structures and algorithms",
        teacherId: "teacher-1",
        schedule: "TTh 2:00-3:30 PM",
        isActive: true,
        createdAt: new Date()
      }
    ];

    sampleClasses.forEach(cls => {
      this.classes.set(cls.id, cls);
    });

    // Enroll students in classes
    sampleStudents.forEach((student, index) => {
      const enrollment: ClassEnrollment = {
        id: `enrollment-${index + 1}`,
        classId: "class-1",
        studentId: student.id,
        enrolledAt: new Date()
      };
      this.classEnrollments.set(enrollment.id, enrollment);
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Students
  async getStudents(): Promise<Student[]> {
    return Array.from(this.students.values());
  }

  async getStudent(id: string): Promise<Student | undefined> {
    return this.students.get(id);
  }

  async getStudentByStudentId(studentId: string): Promise<Student | undefined> {
    return Array.from(this.students.values()).find(student => student.studentId === studentId);
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const id = randomUUID();
    const student: Student = {
      ...insertStudent,
      id,
      photos: [],
      embedding: undefined,
      isTrainingComplete: false,
      createdAt: new Date()
    };
    this.students.set(id, student);
    return student;
  }

  async updateStudent(id: string, updates: Partial<Student>): Promise<Student | undefined> {
    const student = this.students.get(id);
    if (!student) return undefined;
    
    const updated = { ...student, ...updates };
    this.students.set(id, updated);
    return updated;
  }

  async deleteStudent(id: string): Promise<boolean> {
    return this.students.delete(id);
  }

  // Classes
  async getClasses(): Promise<Class[]> {
    return Array.from(this.classes.values());
  }

  async getClass(id: string): Promise<Class | undefined> {
    return this.classes.get(id);
  }

  async createClass(classData: InsertClass & { teacherId: string }): Promise<Class> {
    const id = randomUUID();
    const cls: Class = {
      ...classData,
      id,
      isActive: true,
      createdAt: new Date()
    };
    this.classes.set(id, cls);
    return cls;
  }

  async updateClass(id: string, updates: Partial<Class>): Promise<Class | undefined> {
    const cls = this.classes.get(id);
    if (!cls) return undefined;
    
    const updated = { ...cls, ...updates };
    this.classes.set(id, updated);
    return updated;
  }

  async deleteClass(id: string): Promise<boolean> {
    return this.classes.delete(id);
  }

  // Class Enrollments
  async getClassStudents(classId: string): Promise<Student[]> {
    const enrollments = Array.from(this.classEnrollments.values())
      .filter(enrollment => enrollment.classId === classId);
    
    const students = [];
    for (const enrollment of enrollments) {
      const student = this.students.get(enrollment.studentId!);
      if (student) students.push(student);
    }
    return students;
  }

  async enrollStudent(classId: string, studentId: string): Promise<ClassEnrollment> {
    const id = randomUUID();
    const enrollment: ClassEnrollment = {
      id,
      classId,
      studentId,
      enrolledAt: new Date()
    };
    this.classEnrollments.set(id, enrollment);
    return enrollment;
  }

  async unenrollStudent(classId: string, studentId: string): Promise<boolean> {
    const enrollment = Array.from(this.classEnrollments.values())
      .find(e => e.classId === classId && e.studentId === studentId);
    
    if (!enrollment) return false;
    return this.classEnrollments.delete(enrollment.id);
  }

  // Attendance Sessions
  async getAttendanceSessions(): Promise<AttendanceSession[]> {
    return Array.from(this.attendanceSessions.values());
  }

  async getAttendanceSession(id: string): Promise<AttendanceSession | undefined> {
    return this.attendanceSessions.get(id);
  }

  async createAttendanceSession(session: InsertAttendanceSession): Promise<AttendanceSession> {
    const id = randomUUID();
    const attendanceSession: AttendanceSession = {
      ...session,
      id,
      date: new Date(),
      totalImages: 0,
      totalFacesDetected: 0,
      totalStudentsRecognized: 0,
      averageConfidence: 0,
      status: "pending",
      createdAt: new Date()
    };
    this.attendanceSessions.set(id, attendanceSession);
    return attendanceSession;
  }

  async updateAttendanceSession(id: string, updates: Partial<AttendanceSession>): Promise<AttendanceSession | undefined> {
    const session = this.attendanceSessions.get(id);
    if (!session) return undefined;
    
    const updated = { ...session, ...updates };
    this.attendanceSessions.set(id, updated);
    return updated;
  }

  // Attendance Records
  async getAttendanceRecords(sessionId: string): Promise<AttendanceRecord[]> {
    return Array.from(this.attendanceRecords.values())
      .filter(record => record.sessionId === sessionId);
  }

  async createAttendanceRecord(record: Omit<AttendanceRecord, 'id' | 'createdAt'>): Promise<AttendanceRecord> {
    const id = randomUUID();
    const attendanceRecord: AttendanceRecord = {
      ...record,
      id,
      createdAt: new Date()
    };
    this.attendanceRecords.set(id, attendanceRecord);
    return attendanceRecord;
  }

  // Recognition Results
  async createRecognitionResult(result: Omit<RecognitionResult, 'id' | 'timestamp'>): Promise<RecognitionResult> {
    const id = randomUUID();
    const recognitionResult: RecognitionResult = {
      ...result,
      id,
      timestamp: new Date()
    };
    this.recognitionResults.set(id, recognitionResult);
    return recognitionResult;
  }

  async getRecognitionResults(sessionId: string): Promise<RecognitionResult[]> {
    return Array.from(this.recognitionResults.values())
      .filter(result => result.sessionId === sessionId);
  }
}

export const storage = new MemStorage();
