import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db.js";
import path from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());



// Login API
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE username = ? AND password = ?",
      [username, password]
    );

    if (rows.length > 0) {
      const user = rows[0];
      res.json({
        success: true,
        username: user.username,
        role: user.role,
      });
    } else {
      res.status(401).json({ success: false, message: "Invalid username or password" });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET all flats
// app.get("/api/flats", async (req, res) => {
//   try {
//     const [results] = await pool.query("SELECT * FROM flats");
//     res.json(results);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });


// GET all flats -secod 
app.get("/api/flats", async (req, res) => {
  try {
    const [results] = await pool.query(`
      SELECT 
        flat_key,
        flat_number,
        wing,
        status,
        updated_at,
        DATE_FORMAT(CONVERT_TZ(booking_date, '+00:00', '+00:00'), '%Y-%m-%d') as booking_date,
        DATE_FORMAT(CONVERT_TZ(hold_until, '+00:00', '+05:30'), '%Y-%m-%d %H:%i:%s') as hold_until,
        agreementvalue,
        saleablearea,
        cost
      FROM flats
    `);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




app.put("/api/flats/:flatKey", async (req, res) => {
  const flatKey = req.params.flatKey;
  const { status, date, holdUntil, agreementvalue, saleablearea, cost } = req.body;
  console.log("Saving flat:", flatKey, status, date, holdUntil, agreementvalue, saleablearea, cost);

  try {
    const [result] = await pool.query(
      `UPDATE flats 
       SET status = ?, booking_date = ?, hold_until = ?, agreementvalue = ?, saleablearea = ?, cost = ?, updated_at = CURRENT_TIMESTAMP
       WHERE flat_key = ?`,
      [status, date || null, holdUntil || null, agreementvalue || null, saleablearea || null, cost || null, flatKey]
    );

    if (result.affectedRows === 0) {
      const flatNumber = flatKey.slice(0, -1);
      const wing = flatKey.slice(-1);
      const datetime = new Date();

      await pool.query(
        `INSERT INTO flats 
         (flat_number, wing, flat_key, status, booking_date, hold_until, agreementvalue, saleablearea, cost, updated_at ) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,?)`,
        [flatNumber, wing, flatKey, status, date || null, holdUntil || null, agreementvalue || null, saleablearea || null, cost || null, datetime]
      );
    }

    res.json({ message: "Flat saved successfully" });
  } catch (err) {
    console.error("Error saving flat:", err);
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend (React build inside backend/dist)
// __dirname is /opt/render/project/src/backend on Render.
app.use(express.static(path.join(__dirname, "dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});


app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
