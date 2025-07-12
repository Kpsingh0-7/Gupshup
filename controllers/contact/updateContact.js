import { pool } from "../../config/db.js";

export const updateContact = async (req, res) => {
  const { contact_id, customer_id, country_code, first_name, mobile_no } = req.body;

  // ✅ Step 1: Validate input
  if (!contact_id || !customer_id || !country_code || !first_name || !mobile_no) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: contact_id, customer_id, country_code, first_name, or mobile_no",
    });
  }

  try {
    // ✅ Step 2: Check if the contact exists
    const [existingContact] = await pool.execute(
      `SELECT contact_id FROM contact WHERE contact_id = ? AND customer_id = ?`,
      [contact_id, customer_id]
    );

    if (existingContact.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    // ✅ Step 3: Check for duplicate mobile number with another contact
    const [duplicateCheck] = await pool.execute(
      `SELECT contact_id FROM contact WHERE customer_id = ? AND mobile_no = ? AND contact_id != ?`,
      [customer_id, mobile_no, contact_id]
    );

    if (duplicateCheck.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Mobile number already exists for another contact",
      });
    }

    // ✅ Step 4: Update the contact
    await pool.execute(
      `UPDATE contact SET country_code = ?, first_name = ?, mobile_no = ? WHERE contact_id = ? AND customer_id = ?`,
      [country_code, first_name, mobile_no, contact_id, customer_id]
    );

    return res.status(200).json({
      success: true,
      message: "Contact updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating contact:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
