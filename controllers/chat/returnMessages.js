import { pool } from "../../config/db.js";

export const returnMessages = async (req, res) => {
  const { conversation_id } = req.query;

  if (!conversation_id) {
    return res.status(400).json({ error: "conversation_id is required" });
  }

  try {
    const [rows] = await pool.execute(
      `
      SELECT 
        m.message_type, 
        m.content, 
        m.element_name, 
        m.media_url, 
        m.status, 
        m.sent_at,
        m.template_data,
        wt.data,
        wt.container_meta
      FROM 
        messages m
      LEFT JOIN 
        whatsapp_templates wt ON m.element_name = wt.element_name
      WHERE 
        m.conversation_id = ?
      ORDER BY 
        m.sent_at ASC, 
        m.message_id ASC
    `,
      [conversation_id]
    );

    const safeJSONParse = (value) => {
      try {
        return typeof value === 'string' ? JSON.parse(value) : value;
      } catch {
        return value;
      }
    };

    const parsedRows = rows.map(row => {
      const templateData = safeJSONParse(row.template_data);
      const templateJson = safeJSONParse(row.data);
      const containerMeta = safeJSONParse(row.container_meta);

      return {
        ...row,
        template_data: templateData,
        data: templateJson,
        container_meta: containerMeta,
        container_type: containerMeta?.buttons ? 'button_template' : 'text_template'
      };
    });

    res.json(parsedRows);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
