const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
const authMiddleware = require("./middleware/authMiddleware")
// 🔥 เปิด CORS แบบง่ายสุดก่อน
app.use(cors());

app.use(express.json());

let db;

// ================= START SERVER =================
async function startServer() {
  try {
    db = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "Phianguma@uear",
      database: "mor",
    });

    console.log("✅ Connected to MySQL successfully!");

    app.listen(3000, () => {
      console.log("🚀 Server running on http://localhost:3000");
    });

  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
  }
}

startServer();

// ================= LOGIN =================
app.post("/login", async (req, res) => {
  try {
    console.log("==== LOGIN START ====");
    console.log("Request body:", req.body);

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "กรอกข้อมูลไม่ครบ" });
    }

    const sql = "SELECT * FROM users WHERE u_user = ?";
    console.log("Running SQL:", username);

    const [results] = await db.execute(sql, [username]); // ✅ await แบบถูกต้อง

    console.log("DB Results:", results);

    if (results.length === 0) {
      return res.status(401).json({ message: "ไม่พบผู้ใช้" });
    }

    const user = results[0];

    const match = await bcrypt.compare(password, user.u_pass);
    console.log("Password match:", match);

    if (!match) {
      return res.status(401).json({ message: "รหัสผ่านไม่ถูกต้อง" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.u_user },
      "secretkey123",   // 🔥 ควรเก็บใน .env
      { expiresIn: "1h" }
    );

    console.log(token, user.id, user.callsign);
    res.json({

      message: "Login สำเร็จ",
      token: token,
      user: {
        id: user.id,
        name: user.callsign,
        role: user.u_class,

      },
    });

  } catch (err) {
    console.error("❌ LOGIN ERROR:", err);
    res.status(500).json({ message: "server error" });
  }
});
// ================= เลือกหน่วยงาน =================


app.get("/api/departments", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "select * from kcllu where k_title = 'hospital' and k_status= 'A'"
    );

    // 🔥 แปลง format ให้ตรงกับ Ant Design Select
    const formatted = rows.map(row => ({
      value: row.k_code,
      label: row.k_name
    }));

    res.json(formatted);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "ดึงข้อมูลไม่สำเร็จ" });
  }
});

// ================= เลือกวิชาชีพ และ ระดับ=================


app.get("/api/profession", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "select * from kcllu where k_title = 'profession' and k_status= 'A'"
    );

    // 🔥 แปลง format ให้ตรงกับ Ant Design Select
    const formatted = rows.map(row => ({
      value: row.k_code,
      label: row.k_name
    }));

    res.json(formatted);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "ดึงข้อมูลไม่สำเร็จ" });
  }
});

app.get("/api/gove_profession", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "select * from kcllu where k_title = 'gove_profession' and k_status= 'A'"
    );

    // 🔥 แปลง format ให้ตรงกับ Ant Design Select
    const formatted = rows.map(row => ({
      value: row.k_code,
      label: row.k_name
    }));

    res.json(formatted);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "ดึงข้อมูลไม่สำเร็จ" });
  }
});


// ================= ROUTES =================
app.post("/api/register", async (req, res) => {
  try {
    console.log("🔥 เข้า register แล้ว");

    const { username, password, department, confirm, aka, title, firstName, lastName, cid, phone, email, profession, gove_profession } = req.body;

    const sql = "SELECT * FROM users WHERE u_user = ?";
    const [results] = await db.execute(sql, [username]); // ✅ await แบบถูกต้อง

    console.log(results.length);
    if (results.length > 0) {
      console.log("ผลลัพธ์มีค่ามากว่า 0");
      return res.status(409).json({ message: "มีผู้ใช้ชื่อนี้แล้ว" });
    }


    const hashedPassword = await bcrypt.hash(password, 10);
    const hashdcid = await bcrypt.hash(cid, 10);
    console.log("hash เสร็จ");

    await db.execute(
      "INSERT INTO users (u_user, u_pass,hospital,cid,callsign,ttl,tname,tlname,tel,email,profession,gove_profession) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      [username, hashedPassword, department, hashdcid || null,
        aka || null, title || null, firstName || null, lastName || null, phone || null, email || null,
        profession || null,
        gove_profession || null]
    );

    console.log("insert เสร็จ");

    res.json({ message: "สมัครสมาชิกสำเร็จ" });

  } catch (err) {
    console.log("ERROR:", err);
    res.status(500).json({ message: "error" });
  }
});

// ================= project-data =================
const verifyToken = require("./middleware/authMiddleware");

app.get("/project-data", verifyToken, (req, res) => {
  res.json({
    message: "เข้าถึง project ได้",
    user: req.user
  });
});

// ================= get user =================
app.get("/users", async (req, res) => {
  try {
    //ถ้าเป็นแอดมินที่เป็นหน่วยงาน จะต้อง ส่ง hospital มาด้วย
    const mode = req.query.mode;
    //const hospital = req.query.hospital;

    let sql = "SELECT * FROM users";

    if (mode == '2') {
      sql += " WHERE hospital= 12439";
    }

    if (mode == '3') {
      sql += " where hospital = 9";
    }
    //console.log(req.query);
    //console.log(req.query.mode);

    const [rows] = await db.execute(sql);

    res.json(rows);

  } catch (err) {
    res.status(500).json({ message: "error" });
  }
});

// ================= edit users status =================
app.put("/api/users/status", async (req, res) => {
  const { userId, status } = req.body;

  try {
    await db.execute(
      "UPDATE users SET u_status = ? WHERE u_id = ?",
      [status, userId]
    );

    res.json({ message: "update success" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "update failed" });
  }
});
