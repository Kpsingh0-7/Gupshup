import { pool } from "../../config/db.js";

export const addSingleContact = async (req, res) => {
  const { customer_id, country_code, first_name, mobile_no } = req.body;

  // ✅ Step 1: Validate input
  if (!customer_id || !country_code || !first_name || !mobile_no) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: customer_id, country_code, first_name, or mobile_no",
    });
  }

  try {
    // ✅ Step 2: Check for existing contact
    const [existing] = await pool.execute(
      `SELECT contact_id FROM contact WHERE customer_id = ? AND mobile_no = ?`,
      [customer_id, mobile_no]
    ); 

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Mobile number already exists...",
      });
    }

    // ✅ Step 3: Insert new contact
    const [result] = await pool.execute(
      `
        INSERT INTO contact (customer_id, country_code, first_name, mobile_no)
        VALUES (?, ?, ?, ?)
      `,
      [customer_id, country_code, first_name, mobile_no]
    );

    return res.status(201).json({
      success: true,
      message: "Customer added successfully",
      contact_id: result.insertId,
    });

  } catch (error) {
    console.error("❌ Error adding contact:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
