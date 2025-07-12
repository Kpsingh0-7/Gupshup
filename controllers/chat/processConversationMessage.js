import { pool } from "../../config/db.js";
import { sendTemplate } from "./sendTemplate.js";

export const processConversationMessage = async (req, res) => {
  const { conversation_id, element_name, parameters = [], message } = req.body;

  if (!conversation_id || (!element_name && !message)) {
    return res.status(400).json({
      error: "conversation_id and either element_name or message are required.",
    });
  }

  try {
    // 1. Get customer_id and contact_id from conversations
    const [convoRows] = await pool.execute(
      `SELECT customer_id, contact_id FROM conversations WHERE conversation_id = ?`,
      [conversation_id]
    );

    if (convoRows.length === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const { customer_id, contact_id } = convoRows[0];

    // 2. Update the updated_at timestamp to current time
    await pool.execute(
      `UPDATE conversations SET updated_at = NOW() WHERE conversation_id = ?`,
      [conversation_id]
    );

    // 3. Get mobile number from contact
const [custRows] = await pool.execute(
  `SELECT mobile_no, country_code FROM contact WHERE contact_id = ?`,
  [contact_id]
);

if (custRows.length === 0) {
  return res.status(404).json({ error: "Customer not found" });
}

const { mobile_no, country_code } = custRows[0];

// Combine country code and mobile number
const phoneNumber = `${country_code}${mobile_no}`; // e.g., "+91" + "9876543210"


    // 4. Construct payload
    let payload = null;
    if (element_name) {
      payload = {
        phoneNumber,
        element_name,
        customer_id,
        contact_id,
        languageCode: "en",
        parameters,
      };
    } else if (message) {
      payload = {
        phoneNumber,
        customer_id,
        contact_id,
        message,
      };
    }

    // 5. Create fake req/res to reuse existing template/text handler
    const fakeReq = { body: payload };
    let finalResponse;
    const fakeRes = {
      status: (code) => ({
        json: (data) => {
          res.status(code).json(data);
          finalResponse = { code, data };
        },
      }),
    };

    // 6. Call handler based on message type
    await sendTemplate(fakeReq, fakeRes);
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
