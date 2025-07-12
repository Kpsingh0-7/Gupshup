import { pool } from '../../config/db.js';

export const returnConversations = async (req, res) => {
  const { customer_id } = req.query;

  if (!customer_id) {
    return res
      .status(400)
      .json({ error: "Missing required parameter: customer_id" });
  }

  try {
    // Step 1: Get conversations
    const [rows] = await pool.execute(
      `
      SELECT 
        c.contact_id, 
        c.conversation_id, 
        wp.country_code,
        c.updated_at,
        wp.first_name,
        wp.last_name,
        wp.profile_image,
        wp.mobile_no
      FROM 
        conversations c
      JOIN 
        contact wp ON c.contact_id = wp.contact_id
      WHERE 
        c.customer_id = ?
      ORDER BY 
        c.updated_at DESC
      `,
      [customer_id]
    );

    // Step 2: Extract conversation_ids
    const conversationIds = rows.map((row) => row.conversation_id);
    if (conversationIds.length === 0) {
      return res.json([]); // No conversations
    }

    // Step 3: Get unread counts
    const placeholders = conversationIds.map(() => "?").join(",");
    const [unreadRows] = await pool.execute(
      `
      SELECT conversation_id, COUNT(*) AS unread_count
      FROM messages
      WHERE conversation_id IN (${placeholders})
        AND received_at IS NOT NULL
        AND read_at IS NULL
      GROUP BY conversation_id
      `,
      conversationIds
    );

    // Step 4: Map unread counts to conversation_id
    const unreadMap = {};
    unreadRows.forEach(({ conversation_id, unread_count }) => {
      unreadMap[conversation_id] = unread_count;
    });

    // Step 5: Merge unread count into each conversation
    const enrichedRows = rows.map((row) => ({
      ...row,
      unread_count: unreadMap[row.conversation_id] || 0,
    }));

    res.json(enrichedRows);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
