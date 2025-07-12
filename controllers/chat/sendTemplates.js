import axios from "axios";
import { pool } from "../../config/db.js";
import { updateCreditUsage } from "../updateCreditUsage.js";


export const sendTemplates = async (req, res) => {
  const {
    phoneNumber,
    name,
    element_name,
    languageCode = "en",
    parameters = [],
    shop_id,
  } = req.body;

  try {
    if (!phoneNumber || !name || !shop_id || !element_name) {
      return res.status(400).json({
        success: false,
        error: "phoneNumber, name, shop_id, and element_name are required",
      });
    }
    const customer_id = shop_id;
    const first_name = name;
    // Step 1: Find or insert customer
    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/\D/g, ""); // remove non-digit characters
    const mobileNo = normalizedPhone.slice(-10); // last 10 digits
    const userCountryCode = normalizedPhone.slice(0, -10); // everything before last 10 digits

    // Step 1: Find or insert customer
    const [existingCustomer] = await pool.execute(
      `SELECT contact_id FROM contact WHERE mobile_no = ? AND customer_id = ?`,
      [mobileNo, customer_id]
    );

    let contact_id;

    if (existingCustomer.length > 0) {
      contact_id = existingCustomer[0].contact_id;
    } else {
      const [insertResult] = await pool.execute(
        `INSERT INTO contact (mobile_no, first_name, customer_id, country_code) VALUES (?, ?, ?, ?)`,
        [mobileNo, first_name, customer_id, userCountryCode]
      );
      contact_id = insertResult.insertId;
    }

    // Step 2: Prepare template message payload
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

    // Step 3: Send template message
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

    // Step 4: Log the sent message
    await pool.execute(
      `INSERT INTO messages (conversation_id, sender_type, sender_id, message_type, element_name, template_data, status, external_message_id, sent_at) VALUES (?, 'shop', ?, 'template', ?, ?, 'sent', ?, NOW())`,
      [null, customer_id, element_name, templateData, templateMessageId]
    );

    await updateCreditUsage(customer_id);

    return res.status(200).json({
      success: true,
      messageId: templateMessageId,
      response: templateResponse.data,
    });
  } catch (error) {
    console.error(
      "Error sending WhatsApp template message:",
      error.response?.data || error.message
    );
    return res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
};


