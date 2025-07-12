import axios from 'axios';

export const sendTemplates = async (req, res) => {
  const {
    phoneNumber,
    element_name,
    languageCode = 'en',
    parameters = []
  } = req.body;

  try {
    if (!phoneNumber || !element_name) {
      return res.status(400).json({
        success: false,
        error: 'phoneNumber and element_name are required'
      });
    }

    // Prepare template message payload
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

    // Add body parameters if provided
    if (parameters.length > 0) {
      templateData.template.components.push({
        type: 'body',
        parameters: parameters.map(param => ({
          type: 'text',
          text: param
        }))
      });
    }

    // Add FLOW button (if your template includes it)
    templateData.template.components.push({
      type: 'button',
      sub_type: 'flow',
      index: 0,
      parameters: [
        {
          type: 'payload',
          payload: '1186886462851397' // Your FLOW ID from the template
        }
      ]
    });

    // Send template message via Gupshup
    const templateResponse = await axios.post(
      'https://partner.gupshup.io/partner/app/7f97d76e-d64a-4c7b-b589-7b607dce5b45/v3/message',
      templateData,
      {
        headers: {
          accept: 'application/json',
          Authorization: 'sk_4ac0a398aa5f4cca96d53974904ef1f3', // Change if 'Bearer' needed
          'Content-Type': 'application/json'
        }
      }
    );

    const templateMessageId = templateResponse.data.messages?.[0]?.id || null;
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
