// POST /api/messages/mark-read
import { pool } from "../../config/db.js";

export const markMessagesAsRead = async (req, res) => {
  const { conversation_id } = req.body;

  if (!conversation_id) {
    return res.status(400).json({ error: "conversation_id is required" });
  }

  try {
    const [result] = await pool.execute(
      `UPDATE messages
       SET read_at = CURRENT_TIMESTAMP
       WHERE conversation_id = ? AND read_at IS NULL`,
      [conversation_id]
    );

    // Optionally emit a socket event here if needed
    // req.app.get("io").to(conversation_id.toString()).emit("message_read", { conversation_id });

    return res.json({
      success: true,
      conversation_id,
      updated_rows: result.affectedRows,
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
