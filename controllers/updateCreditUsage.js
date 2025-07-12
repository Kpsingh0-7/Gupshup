import { pool } from "../config/db.js";
import moment from "moment";

export const updateCreditUsage = async (customer_id, direction = "sent") => {
  const today = moment().format("YYYY-MM-DD");
  const creditConsumed = 1;
  const costPerMsg = 1;
  const gsFee = 0.2;
  const metaFee = 0.8;

  try {
    console.log(`[${today}] Starting updateCreditUsage for customer_id:`, customer_id);

    const [existingUsage] = await pool.execute(
      `SELECT id, credit_remaining, credit_consumed FROM customer_credit_usage 
       WHERE customer_id = ? AND usage_date = ?`,
      [customer_id, today]
    );

    if (existingUsage.length > 0) {
      console.log("🟢 Existing usage found for today. Updating...");

      const currentRemaining = parseFloat(existingUsage[0].credit_remaining || 0);
      const newRemaining = Math.max(currentRemaining - creditConsumed, 0);

      console.log("➡️ Current Remaining:", currentRemaining);
      console.log("➡️ New Remaining after deduction:", newRemaining);

      await pool.execute(
        `UPDATE customer_credit_usage 
         SET 
           messages_sent = messages_sent + ?,
           messages_received = messages_received + ?,
           credit_consumed = credit_consumed + ?,
           credit_remaining = ?,
           total_cost = total_cost + ?,
           gupshup_fees = gupshup_fees + ?,
           meta_fees = meta_fees + ?,
           updated_at = NOW()
         WHERE customer_id = ? AND usage_date = ?`,
        [
          direction === "sent" ? 1 : 0,
          direction === "received" ? 1 : 0,
          creditConsumed,
          newRemaining,
          costPerMsg,
          gsFee,
          metaFee,
          customer_id,
          today,
        ]
      );

      // Do NOT update customer totals here for ongoing day
    } else {
      console.log("🆕 No usage found for today. Inserting new record...");

      // Get previous day's credit_remaining
      const [[prevUsage]] = await pool.execute(
        `SELECT credit_remaining FROM customer_credit_usage 
         WHERE customer_id = ? AND usage_date < ? 
         ORDER BY usage_date DESC 
         LIMIT 1`,
        [customer_id, today]
      );

      let previousCredit = prevUsage ? parseFloat(prevUsage.credit_remaining || 0) : null;

      if (previousCredit === null) {
        const [[customerData]] = await pool.execute(
          `SELECT total_credit_remaining FROM customer WHERE customer_id = ?`,
          [customer_id]
        );
        previousCredit = parseFloat(customerData?.total_credit_remaining || 0);
      }

      const remainingCredit = Math.max(previousCredit - creditConsumed, 0);

      console.log("➡️ Previous Credit:", previousCredit);
      console.log("➡️ Remaining Credit after insert:", remainingCredit);

      await pool.execute(
        `INSERT INTO customer_credit_usage 
         (customer_id, usage_date, credit_consumed, credit_remaining, messages_sent, messages_received, total_cost, gupshup_fees, meta_fees) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customer_id,
          today,
          creditConsumed,
          remainingCredit,
          direction === "sent" ? 1 : 0,
          direction === "received" ? 1 : 0,
          costPerMsg,
          gsFee,
          metaFee,
        ]
      );

      // Now update customer total_credit_consumed and total_credit_remaining with **yesterday's** usage only
      const [[latestPrevious]] = await pool.execute(
        `SELECT credit_consumed 
         FROM customer_credit_usage 
         WHERE customer_id = ? AND usage_date < ?
         ORDER BY usage_date DESC
         LIMIT 1`,
        [customer_id, today]
      );

      const previousDayConsumed = parseFloat(latestPrevious?.credit_consumed || 0);

      // Fetch existing customer total_credit_consumed and total_credit
      const [[customerData]] = await pool.execute(
        `SELECT total_credit_consumed, total_credit FROM customer WHERE customer_id = ?`,
        [customer_id]
      );

      const oldTotalConsumed = parseFloat(customerData?.total_credit_consumed || 0);
      const totalCredit = parseFloat(customerData?.total_credit || 0);

      const newTotalConsumed = oldTotalConsumed + previousDayConsumed;
      const newRemaining = Math.max(totalCredit - newTotalConsumed, 0);

      console.log("📊 New total_credit_consumed:", newTotalConsumed);
      console.log("📉 New total_credit_remaining:", newRemaining);

      await pool.execute(
        `UPDATE customer 
         SET 
           total_credit_consumed = ?, 
           total_credit_remaining = ?
         WHERE customer_id = ?`,
        [newTotalConsumed, newRemaining, customer_id]
      );
    }

    console.log("✅ updateCreditUsage completed for:", customer_id);
  } catch (err) {
    console.error("❌ Error updating credit usage:", err.message);
    throw err;
  }
};
