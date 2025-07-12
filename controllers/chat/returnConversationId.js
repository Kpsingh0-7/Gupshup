import { pool } from "../../config/db.js";

export const returnConversationId = async (req, res) => {
  const { contact_id } = req.query;

  if (!contact_id) {
    return res.status(400).json({ error: "Missing required parameter: contact_id" });
  }

  try {
    // Step 1: Get customer_id from contact
    const [shopResult] = await pool.execute(
      `SELECT customer_id FROM contact WHERE contact_id = ?`,
      [contact_id]
    );

    if (shopResult.length === 0) {
      return res.status(404).json({ error: "No shop found for given contact_id" });
    }

    const customer_id = shopResult[0].customer_id;

    // Step 2: Check if conversation exists
    const [conversationResult] = await pool.execute(
      `SELECT conversation_id FROM conversations WHERE contact_id = ? AND customer_id = ?`,
      [contact_id, customer_id]
    );

    if (conversationResult.length > 0) {
      // Conversation exists
      return res.json({ conversation_id: conversationResult[0].conversation_id });
    }

    // Step 3: Insert new conversation
    const [insertResult] = await pool.execute(
      `INSERT INTO conversations (contact_id, customer_id) VALUES (?, ?)`,
      [contact_id, customer_id]
    );

    return res.json({ conversation_id: insertResult.insertId });

  } catch (error) {
    console.error("Error handling conversation:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
