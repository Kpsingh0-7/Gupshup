import axios from "axios";
import dotenv from "dotenv";
import moment from "moment";
import { pool } from "../../config/db.js";
import { updateCreditUsage } from "../updateCreditUsage.js";

dotenv.config();

export const sendTemplate = async (req, res) => {
  const {
    phoneNumber,
    message,
    element_name,
    languageCode = "en",
    parameters = [],
    customer_id,
    contact_id,
  } = req.body;

  try {
    if (!phoneNumber || !customer_id || !contact_id) {
      return res
        .status(400)
        .json({
          success: false,
          error: "phoneNumber, customer_id, and contact_id are required",
        });
    }

    // Ensure conversation exists (or create one)
    const [existing] = await pool.execute(
      `SELECT conversation_id FROM conversations WHERE customer_id = ? AND contact_id = ?`,
      [customer_id, contact_id]
    );

    let conversation_id;
    if (existing.length > 0) {
      conversation_id = existing[0].conversation_id;
    } else {
      const [insertResult] = await pool.execute(
        `INSERT INTO conversations (customer_id, contact_id) VALUES (?, ?)`,
        [customer_id, contact_id]
      );
      conversation_id = insertResult.insertId;
    }

    const [rows] = await pool.execute(
      `SELECT sent_at FROM messages 
       WHERE conversation_id = ? 
       ORDER BY sent_at DESC 
       LIMIT 1`,
      [conversation_id]
    );

    const lastMessageTimestamp = rows.length > 0 ? rows[0].sent_at : null;
    const isWithin24Hours =
      lastMessageTimestamp &&
      moment().diff(moment.utc(lastMessageTimestamp), "hours") < 24;

    let responses = [];

    // Send Free-form Message (within 24-hour window)
    if (isWithin24Hours && message) {
      const freeFormData = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneNumber,
        type: "text",
        text: { body: message },
      };

      const freeFormResponse = await axios.post(
        `https://partner.gupshup.io/partner/app/7f97d76e-d64a-4c7b-b589-7b607dce5b45/v3/message`,
        freeFormData,
        {
          headers: {
            accept: "application/json",
            Authorization: "sk_4ac0a398aa5f4cca96d53974904ef1f3",
            "Content-Type": "application/json",
          },
        }
      );

      const freeFormMessageId = freeFormResponse.data.messages?.[0]?.id || null;

      await pool.execute(
        `INSERT INTO messages 
          (conversation_id, sender_type, sender_id, message_type, content, status, external_message_id, sent_at) 
         VALUES (?, 'shop', ?, 'text', ?, 'sent', ?, NOW())`,
        [conversation_id, customer_id, message, freeFormMessageId]
      );
await updateCreditUsage(customer_id, 'sent');

      responses.push({
        type: "text",
        messageId: freeFormMessageId,
        response: freeFormResponse.data,
      });
    }

    // Send Template Message
    if (element_name) {
      const templateData = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneNumber,
        type: "template",
        template: {
          name: element_name,
          language: { code: languageCode },
          components: [],
        },
      };

      if (parameters.length > 0) {
        templateData.template.components.push({
          type: "body",
          parameters: parameters.map((param) => ({
            type: "text",
            text: param,
          })),
        });
      }

      const templateResponse = await axios.post(
        `https://partner.gupshup.io/partner/app/7f97d76e-d64a-4c7b-b589-7b607dce5b45/v3/message`,
        templateData,
        {
          headers: {
            accept: "application/json",
            Authorization: "sk_4ac0a398aa5f4cca96d53974904ef1f3",
            "Content-Type": "application/json",
          },
        }
      );

      const templateMessageId = templateResponse.data.messages?.[0]?.id || null;

      await pool.execute(
        `INSERT INTO messages 
          (conversation_id, sender_type, sender_id, message_type, element_name, template_data, status, external_message_id, sent_at) 
         VALUES (?, 'shop', ?, 'template', ?, ?, 'sent', ?, NOW())`,
        [
          conversation_id,
          customer_id,
          element_name,
          //JSON.stringify({ parameters }),
          JSON.stringify(templateData),
          templateMessageId,
        ]
      );
await updateCreditUsage(customer_id, 'sent');

      responses.push({
        type: "template",
        messageId: templateMessageId,
        response: templateResponse.data,
      });
    }

    return res.status(200).json({
      success: true,
      responses,
    });
  } catch (error) {
    console.error(
      "Error sending WhatsApp message:",
      error.response?.data || error.message
    );
    return res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
};
