import { pool } from "../../config/db.js";

export const returnContacts = async (req, res) => {
  const { customer_id } = req.query;

  // Validate customer_id
  if (!customer_id) {
    return res
      .status(400)
      .json({ error: "Missing required parameter: customer_id" });
  }
  try {
    const [rows] = await pool.execute(
      `
        SELECT 
          fg.created_at,
          fg.first_name,
          fg.last_name,
          fg.mobile_no,
          fg.contact_id,
          fg.country_code,
          c.is_active
        FROM 
          contact fg
        LEFT JOIN 
          conversations c 
        ON 
          fg.contact_id = c.contact_id AND fg.customer_id = c.customer_id
        WHERE 
          fg.customer_id = ?
        ORDER BY 
          fg.created_at DESC
      `,
      [customer_id]
    );

    res.json(rows);
  } catch (error) {
    console.error("Error fetching guests:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
