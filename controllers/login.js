// // authController.js
// import jwt from "jsonwebtoken";
// import axios from "axios";

// // Secret key for signing JWT
// const SECRET = "super_secret_key_12345";

// // Cookie options
// const cookieOptions = {
//   httpOnly: true,
//   secure: true, // ⚠️ Set to false in local dev without HTTPS
//   sameSite: "None",
  
//   maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
// };

// // LOGIN Route
// export const loginUser = async (req, res) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return res.status(400).json({ error: "Email and password are required." });
//   }

//   try {
//     const login_datetime = encodeURIComponent(
//       new Date().toLocaleString("en-GB", {
//         day: "2-digit",
//         month: "2-digit",
//         year: "numeric",
//         hour: "2-digit",
//         minute: "2-digit",
//         hour12: true,
//       })
//     );

//     const url = `https://api.foodchow.com/api/UserMaster/AdminUserPOSLogin?email_id=${email}&pwd=${password}&device_type=3&device_id=web&login_datetime=${login_datetime}`;

//     const response = await axios.get(url);
//     const { success, data } = response.data;

//     if (!success || !data || data.length === 0) {
//       return res.status(401).json({ error: "Invalid email or password." });
//     }

//     const user = data[0];

//     // Generate JWT
//     const token = jwt.sign(
//       {
//         customer_id: user.shop_id,
//         email: email,
//       },
//       SECRET,
//       { expiresIn: "30d" }
//     );

//     // Set JWT as httpOnly cookie
//     res.cookie("auth_token", token, cookieOptions);

//     return res.json({
//       success: true,
//       message: "Login successful",
//       user: {
//         customer_id: user.shop_id,
//         email: email,
//       },
//     });
//   } catch (err) {
//     console.error("Login error:", err.message);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };

// // ME Route
// export const getMe = (req, res) => {
//   const token = req.cookies.auth_token;

//   if (!token) {
//     return res.status(401).json({ success: false, error: "No token found" });
//   }

//   try {
//     const decoded = jwt.verify(token, SECRET);
//     res.json({
//       success: true,
//       user: {
//         customer_id: decoded.customer_id,
//         email: decoded.email,
//       },
//     });
//   } catch (err) {
//     res.status(401).json({ success: false, error: "Invalid or expired token" });
//   }
// };

// // LOGOUT Route
// export const logoutUser = (req, res) => {
//   res.clearCookie("auth_token", {
//     httpOnly: true,
//     secure: true,
//     sameSite: "Strict",
//   });

//   return res.json({ success: true, message: "Logged out successfully" });
// };


// authController.js
import jwt from "jsonwebtoken";
import { pool } from '../config/db.js';

const SECRET = "super_secret_key_12345";

const cookieOptions = {
  httpOnly: true,
  secure: true, // false in dev
  sameSite: "None",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const [rows] = await pool.query(
      "SELECT customer_id AS customer_id, email_id, password, role, allowed_routes FROM customer WHERE email_id = ?",
      [email]
    );

    const user = rows[0];

    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign(
      { customer_id: user.customer_id, email: user.email },
      SECRET,
      { expiresIn: "30d" }
    );

    res.cookie("auth_token", token, cookieOptions);

    return res.json({
      success: true,
      message: "Login successful",
      user: {
        customer_id: user.customer_id,
        email: user.email,
        role: user.role,
        allowed_routes: user.allowed_routes,
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


// ME Route
export const getMe = (req, res) => {
  const token = req.cookies.auth_token;

  if (!token) {
    return res.status(401).json({ success: false, error: "No token found" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    res.json({
      success: true,
      user: {
        customer_id: decoded.customer_id,
        email: decoded.email,
      },
    });
  } catch (err) {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
};

// LOGOUT Route
export const logoutUser = (req, res) => {
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  });

  return res.json({ success: true, message: "Logged out successfully" });
};
