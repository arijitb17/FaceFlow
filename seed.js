// seed.js
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
    const adminRes = await pool.query(
      `INSERT INTO users (username, password, name, role, email)
       VALUES ($1, $2, $3, 'admin', $4)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      ["admin", adminPass, "Demo Admin", "admin@demo.com"]
    );
    const adminId = adminRes.rows[0]?.id;

    /** ---------------- Teacher ---------------- */
    const teacherRes = await pool.query(
      `INSERT INTO users (username, password, name, role, email)
       VALUES ($1, $2, $3, 'teacher', $4)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      ["teacher", teacherPass, "Demo Teacher", "teacher@demo.com"]
    );
    const teacherId = teacherRes.rows[0]?.id;

    if (teacherId) {
      await pool.query(
        `INSERT INTO teachers (user_id, department, employee_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (employee_id) DO NOTHING`,
        [teacherId, "Computer Science", "TCHR001"]
      );
    }

    /** ---------------- Student ---------------- */
    const studentRes = await pool.query(
      `INSERT INTO users (username, password, name, role, email)
       VALUES ($1, $2, $3, 'student', $4)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      ["student", studentPass, "Demo Student", "student@demo.com"]
    );
    const studentUserId = studentRes.rows[0]?.id;

    if (studentUserId) {
      await pool.query(
        `INSERT INTO students (user_id, student_id, roll_no, name, email, year_level, program)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (roll_no) DO NOTHING`,
        [
          studentUserId,
          "ADM001", // admission/student ID
          "R001",   // roll number
          "Demo Student",
          "student@demo.com",
          1,        // yearLevel
          "Computer Science",
        ]
      );
    }

    console.log("✅ Seeding complete!");
  } catch (err) {
    console.error("❌ Seeding error:", err);
  } finally {
    await pool.end();
  }
}

seed();
