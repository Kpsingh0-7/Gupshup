import axios from 'axios';
import { updateCreditUsage } from "../updateCreditUsage.js";


export const sendBroadcast = async (req, res) => {
  const {
    customer_id,
    phoneNumbers,
    element_name,
    parameters = [],
    languageCode = 'en'
  } = req.body;

  // Basic validation
  if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0 || !element_name) {
    return res.status(400).json({
      success: false,
      error: 'phoneNumbers (array) and element_name are required'
    });
  }

  // Conditional validation if parameters are provided
  if (parameters.length > 0 && parameters.length !== phoneNumbers.length) {
    return res.status(400).json({
      success: false,
      error: 'If parameters are provided, their count must match phoneNumbers'
    });
  }

  const responses = [];

  for (let i = 0; i < phoneNumbers.length; i++) {
    const phoneNumber = phoneNumbers[i];
    const paramSet = parameters[i] || []; // Use empty array if no parameters for this number

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

    if (Array.isArray(paramSet) && paramSet.length > 0) {
      templateData.template.components.push({
        type: 'body',
        parameters: paramSet.map(param => ({
          type: 'text',
          text: param
        }))
      });
    }

    try {
      const templateResponse = await axios.post(
        `https://partner.gupshup.io/partner/app/7f97d76e-d64a-4c7b-b589-7b607dce5b45/v3/message`,
        templateData,
        {
          headers: {
            'accept': 'application/json',
            'Authorization': "sk_4ac0a398aa5f4cca96d53974904ef1f3",
            'Content-Type': 'application/json'
          }
        }
      );

      responses.push({
        phoneNumber,
        success: true,
        response: templateResponse.data
      });
      await updateCreditUsage(customer_id);

    } catch (error) {
      console.error(`Error sending to ${phoneNumber}:`, error.response?.data || error.message);
      responses.push({
        phoneNumber,
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data
      });
    }
  }

  return res.status(207).json({ results: responses });
};
