import { pool } from "../../config/db.js";

export const returnGroups = async (req, res) => {
  const { group_id, customer_id } = req.query;

  try {
    if (!group_id) {
      if (!customer_id) {
        return res.status(400).json({
          success: false,
          message: "Missing customer_id",
        });
      }

      // ✅ Return only groups belonging to the customer
      const [groups] = await pool.execute(
        `SELECT group_id, group_name FROM contact_group WHERE customer_id = ? ORDER BY group_name`,
        [customer_id]
      );

      return res.status(200).json({
        success: true,
        data: groups, // Array of { group_id, group_name }
      });
    } else {
      // ✅ Return customers (contact_id, name, mobile_no) in that group
      const [customers] = await pool.execute(
        `
        SELECT c.contact_id, c.first_name, c.last_name, c.mobile_no
        FROM contact_group_map gm
        JOIN contact c ON gm.contact_id = c.contact_id
        WHERE gm.group_id = ?
        `,
        [group_id]
      );

      return res.status(200).json({
        success: true,
        data: customers, // Array of { contact_id, name, mobile_no }
      });
    }
  } catch (error) {
    console.error("❌ Error fetching group or customer data:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
