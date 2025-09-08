// seed.js - Fixed version with consistent normalization
import pkg from "pg";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function seed() {
  try {
    console.log("🌱 Seeding database...");

    const adminPass = await bcrypt.hash("admin123", 10);
    const teacherPass = await bcrypt.hash("teacher123", 10);
    const studentPass = await bcrypt.hash("student123", 10);

    /** ---------------- Admin ---------------- */
    console.log("Creating admin user...");
    const adminRes = await pool.query(
      `INSERT INTO users (username, password, name, role, email, is_active)
       VALUES ($1, $2, $3, 'admin', $4, true)
       ON CONFLICT (username) DO UPDATE SET 
         password = EXCLUDED.password,
         email = EXCLUDED.email,
         is_active = EXCLUDED.is_active
       RETURNING id`,
      ["admin", adminPass, "Demo Admin", "admin@demo.com"]
    );
    const adminId = adminRes.rows[0]?.id;
    console.log("Admin created with ID:", adminId);

    /** ---------------- Teacher ---------------- */
    console.log("Creating teacher user...");
    const teacherRes = await pool.query(
      `INSERT INTO users (username, password, name, role, email, is_active)
       VALUES ($1, $2, $3, 'teacher', $4, true)
       ON CONFLICT (username) DO UPDATE SET 
         password = EXCLUDED.password,
         email = EXCLUDED.email,
         is_active = EXCLUDED.is_active
       RETURNING id`,
      ["teacher", teacherPass, "Demo Teacher", "teacher@demo.com"]
    );
    const teacherId = teacherRes.rows[0]?.id;
    console.log("Teacher created with ID:", teacherId);

    if (teacherId) {
      await pool.query(
        `INSERT INTO teachers (user_id, department, employee_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (employee_id) DO UPDATE SET
           department = EXCLUDED.department
         `,
        [teacherId, "Computer Science", "TCHR001"]
      );
      console.log("Teacher profile created");
    }

    /** ---------------- Student ---------------- */
    console.log("Creating student user...");
    const studentRes = await pool.query(
      `INSERT INTO users (username, password, name, role, email, is_active)
       VALUES ($1, $2, $3, 'student', $4, true)
       ON CONFLICT (username) DO UPDATE SET 
         password = EXCLUDED.password,
         email = EXCLUDED.email,
         is_active = EXCLUDED.is_active
       RETURNING id`,
      ["stu2025001", studentPass, "Demo Student", "student@demo.com"]
    );
    const studentUserId = studentRes.rows[0]?.id;
    console.log("Student created with ID:", studentUserId);

    if (studentUserId) {
      await pool.query(
        `INSERT INTO students (user_id, student_id, roll_no, name, email, year_level, program)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (roll_no) DO UPDATE SET
           student_id = EXCLUDED.student_id,
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           year_level = EXCLUDED.year_level,
           program = EXCLUDED.program`,
        [
          studentUserId,
          "STU2025001", // admission/student ID
          "R001",       // roll number
          "Demo Student",
          "student@demo.com",
          1,            // yearLevel
          "Computer Science",
        ]
      );
      console.log("Student profile created");
    }

    // Verify the seeded users
    console.log("\n--- Verifying seeded data ---");
    const users = await pool.query("SELECT id, username, name, role, email, is_active FROM users ORDER BY role");
    console.log("Users in database:");
    users.rows.forEach(user => {
      console.log(`- ${user.role}: ${user.username} (${user.email}) - Active: ${user.is_active}`);
    });

    const students = await pool.query("SELECT student_id, roll_no, name, email FROM students");
    console.log("Students in database:");
    students.rows.forEach(student => {
      console.log(`- ${student.student_id}: ${student.name} - Roll: ${student.roll_no}`);
    });

    console.log("\n✅ Seeding complete!");
    console.log("\n📋 Demo Credentials:");
    console.log("Admin: username 'admin', password 'admin123'");
    console.log("Teacher: username 'teacher', password 'teacher123'");
    console.log("Student: email 'student@demo.com', roll 'R001', password 'student123'");
    
  } catch (err) {
    console.error("❌ Seeding error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();