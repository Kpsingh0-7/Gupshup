import { pool } from "../config/db.js";

export const returnCustomerCreditUsage = async (req, res) => {
  const { customer_id } = req.query;

  if (!customer_id) {
    return res.status(400).json({ error: "customer_id is required" });
  }

  try {
    // Get usage history
    const [usageRows] = await pool.execute(
      `
      SELECT 
        customer_id,
        DATE_FORMAT(usage_date, '%Y-%m-%d') AS usage_date,
        messages_sent,
        messages_received,
        total_cost,
        gupshup_fees,
        meta_fees
      FROM 
        customer_credit_usage
      WHERE 
        customer_id = ?
      ORDER BY 
        usage_date ASC
      `,
      [customer_id]
    );

    // Get total credit info from customer table
    const [[customerInfo]] = await pool.execute(
      `
      SELECT 
        total_credit,
        total_credit_remaining,
        total_credit_consumed
      FROM 
        customer
      WHERE 
        customer_id = ?
      `,
      [customer_id]
    );

    res.json({
      total_credit: parseFloat(customerInfo?.total_credit || 0),
      total_credit_remaining: parseFloat(customerInfo?.total_credit_remaining || 0),
      total_credit_consumed: parseFloat(customerInfo?.total_credit_consumed || 0),
      usage_history: usageRows
    });
  } catch (error) {
    console.error("Error fetching credit usage:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
