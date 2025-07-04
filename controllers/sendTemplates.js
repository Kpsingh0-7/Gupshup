import axios from 'axios';
import { pool } from '../config/db.js';

export const sendTemplates = async (req, res) => {
  const {
    phoneNumber,
    name,
    element_name,
    languageCode = 'en',
    parameters = [],
    shop_id
  } = req.body;

  try {
    if (!phoneNumber || !name || !shop_id || !element_name) {
      return res.status(400).json({
        success: false,
        error: 'phoneNumber, name, shop_id, and element_name are required'
      });
    }

    // Step 1: Find or insert customer
        // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/\D/g, ''); // remove non-digit characters
    const mobileNo = normalizedPhone.slice(-10); // last 10 digits
    const userCountryCode = normalizedPhone.slice(0, -10); // everything before last 10 digits

    // Step 1: Find or insert customer
    const [existingCustomer] = await pool.execute(
      `SELECT customer_id FROM wp_customer_marketing WHERE mobile_no = ? AND shop_id = ?`,
      [mobileNo, shop_id]
    );

    let customer_id;

    if (existingCustomer.length > 0) {
      customer_id = existingCustomer[0].customer_id;
    } else {
      const [insertResult] = await pool.execute(
        `INSERT INTO wp_customer_marketing (mobile_no, name, shop_id, user_country_code) VALUES (?, ?, ?, ?)`,
        [mobileNo, name, shop_id, userCountryCode]
      );
      customer_id = insertResult.insertId;
    }

    // Step 2: Prepare template message payload
    const templateData = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'template',
      template: {
        name: element_name,
        language: { code: languageCode },
        components: []
      }
    };

    if (parameters.length > 0) {
      templateData.template.components.push({
        type: 'body',
        parameters: parameters.map(param => ({
          type: 'text',
          text: param
        }))
      });
    }

    // Step 3: Send template message
    const templateResponse = await axios.post(
      `https://partner.gupshup.io/partner/app/7f97d76e-d64a-4c7b-b589-7b607dce5b45/v3/message`,
      templateData,
      {
        headers: {
          accept: 'application/json',
          Authorization: 'sk_4ac0a398aa5f4cca96d53974904ef1f3',
          'Content-Type': 'application/json'
        }
      }
    );

    const templateMessageId = templateResponse.data.messages?.[0]?.id || null;

    // Step 4: Log the sent message
    await pool.execute(
     `INSERT INTO messages (conversation_id, sender_type, sender_id, message_type, element_name, template_data, status, external_message_id, sent_at, shop_id) VALUES (?, 'shop', ?, 'template', ?, ?, 'sent', ?, NOW(), ?)`,
[null, 1, element_name, JSON.stringify({ templateData }), templateMessageId, shop_id]
);

    return res.status(200).json({
      success: true,
      messageId: templateMessageId,
      response: templateResponse.data
    });

  } catch (error) {
    console.error('Error sending WhatsApp template message:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
      details: error.response?.data
    });
  }
};
