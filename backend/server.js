// const express = require("express");
// const cors = require("cors");
// require("dotenv").config();
// const pool = require("./db");

// const app = express();
// const PORT = process.env.PORT || 5000;

// // Middleware
// app.use(cors());

// app.use(express.json());

// // Sample route
// app.get("/", (req, res) => {
//   res.send("Backend is running 🚀");
// });


// // Login API
// app.post("/api/login", async (req, res) => {
//   const { username, password } = req.body;

//   try {
//     const [rows] = await pool.query(
//       "SELECT * FROM users WHERE username = ? AND password = ?",
//       [username, password]
//     );

//     if (rows.length > 0) {
//       const user = rows[0];
//       res.json({
//         success: true,
//         username: user.username,
//         role: user.role,
//       });
//     } else {
//       res.status(401).json({ success: false, message: "Invalid username or password" });
//     }
//   } catch (err) {
//     console.error("Login error:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });


// // GET all flats
// app.get('/api/flats', async (req, res) => {
//   try {
//     const [results] = await pool.query("SELECT * FROM flats");
//     res.json(results);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });


// // UPDATE flat status
// app.put('/api/flats/:flatKey', async (req, res) => {
//   const flatKey = req.params.flatKey;
//   const { status, date, holdUntil } = req.body;
//   console.log("Saving flat:", flatKey, status, date, holdUntil);
//   try {
//     // Try updating first
//     const [result] = await pool.query(
//       `UPDATE flats 
//        SET status = ?, booking_date = ?, hold_until = ?, updated_at = CURRENT_TIMESTAMP 
//        WHERE flat_key = ?`,
//       [status, date || null, holdUntil || null, flatKey]
//     );

//     // If no row updated → insert new
//     if (result.affectedRows === 0) {
//       const flatNumber = flatKey.slice(0, -1); // e.g., 202A → 202
//       const wing = flatKey.slice(-1);          // e.g., 202A → A

//       await pool.query(
//         `INSERT INTO flats 
//          (flat_number, wing, flat_key, status, booking_date, hold_until) 
//          VALUES (?, ?, ?, ?, ?, ?)`,
//         [flatNumber, wing, flatKey, status, date || null, holdUntil || null]
//       );
//     }

//     res.json({ message: "Flat saved successfully" });
//   } catch (err) {
//     console.error("Error saving flat:", err);
//     res.status(500).json({ error: err.message });
//   }
// });


// // To hold :
// // app.put("/api/flats/:id", (req, res) => {
// //   const flatKey = req.params.id;
// //   const { status, date, holdUntil } = req.body;

// //   console.log("Incoming update:", { flatKey, status, date, holdUntil });

// //   const sql = `
// //     UPDATE flats 
// //     SET status = ?, booking_date = ?, hold_until = ?, updated_at = CURRENT_TIMESTAMP
// //     WHERE flat_key = ?
// //   `;

// //   db.run(sql, [status, date || null, holdUntil || null, flatKey], function (err) {
// //     if (err) return res.status(500).json({ error: err.message });
// //     res.json({ message: "Flat updated successfully" });
// //   });
// // });

// app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));



import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Sample route
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

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
app.get("/api/flats", async (req, res) => {
  try {
    const [results] = await pool.query("SELECT * FROM flats");
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE flat status
app.put("/api/flats/:flatKey", async (req, res) => {
  const flatKey = req.params.flatKey;
  const { status, date, holdUntil } = req.body;
  console.log("Saving flat:", flatKey, status, date, holdUntil);

  try {
    const [result] = await pool.query(
      `UPDATE flats 
       SET status = ?, booking_date = ?, hold_until = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE flat_key = ?`,
      [status, date || null, holdUntil || null, flatKey]
    );

    if (result.affectedRows === 0) {
      const flatNumber = flatKey.slice(0, -1);
      const wing = flatKey.slice(-1);

      await pool.query(
        `INSERT INTO flats 
         (flat_number, wing, flat_key, status, booking_date, hold_until) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [flatNumber, wing, flatKey, status, date || null, holdUntil || null]
      );
    }

    res.json({ message: "Flat saved successfully" });
  } catch (err) {
    console.error("Error saving flat:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
