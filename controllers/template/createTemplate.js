import axios from 'axios';
import { pool } from "../../config/db.js";
import dotenv from 'dotenv';
dotenv.config();

export const createTemplate = async (req, res) => {
  const {
    elementName,
    content,
    category = 'MARKETING',
    templateType,
    languageCode = 'en',
    header,
    footer,
    buttons = [],
    example,
    exampleHeader,
    messageSendTTL
  } = req.body;
console.log({
  elementName,
  content,
  category,
  templateType,
  languageCode,
  header,
  footer,
  buttons,
  example,
  exampleHeader,
  messageSendTTL
});
  try {
    // Validate required fields
    if (!elementName || !content) {
      return res.status(400).json({
        success: false,
        error: 'elementName and content are required fields'
      });
    }

    const encodedParams = new URLSearchParams();

    // Required parameters
    encodedParams.set('elementName', elementName);
    encodedParams.set('languageCode', languageCode);
    encodedParams.set('category', category);
    encodedParams.set('templateType', templateType);
    encodedParams.set('vertical', 'TEXT');
    encodedParams.set('content', content);
    encodedParams.set('allowTemplateCategoryChange', 'false');
    encodedParams.set('message_send_ttl_seconds', messageSendTTL.toString());
    encodedParams.set('enableSample', 'true');

    // Header and footer 
    encodedParams.set('header', header);
    encodedParams.set('footer', footer);
    encodedParams.set('exampleHeader', exampleHeader );

    // Handle buttons
    // if (buttons.length > 0) {
    //   encodedParams.set('buttons', JSON.stringify(buttons));
    // } else if (category === 'AUTHENTICATION') {
    //   encodedParams.set('buttons', JSON.stringify([{
    //     type: 'OTP',
    //     otp_type: 'COPY_CODE',
    //     text: 'Copy OTP'
    //   }]));
    // } else {
    //   // Optional default for non-auth
    //   encodedParams.set('buttons', JSON.stringify([
    //     { type: 'QUICK_REPLY', text: 'Track Order' }
    //   ]));
    // }
// Only set buttons if provided manually
if (buttons.length > 0) {
  encodedParams.set('buttons', JSON.stringify(buttons));
}

    // Example generation
    const generatedExample = example || 
      content.replace(/\{\{1\}\}/g, '4')
             .replace(/\{\{2\}\}/g, '2025-04-25');  // Use future-looking date
    encodedParams.set('example', generatedExample);

    // Send API request
    const response = await axios.post(
      `https://partner.gupshup.io/partner/app/7f97d76e-d64a-4c7b-b589-7b607dce5b45/templates`,
      encodedParams.toString(),
      {
        headers: {
          accept: 'application/json',
          token: "sk_4ac0a398aa5f4cca96d53974904ef1f3",
          'content-type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const template = response.data.template;

    // Insert into MySQL database
    const insertQuery = `
      INSERT INTO whatsapp_templates (
        id, external_id, app_id, waba_id,
        element_name, category, language_code, template_type,
        status, data, container_meta, created_on, modified_on
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      template.id,
      null,
      template.appId,
      template.wabaId,
      template.elementName,
      template.category,
      template.languageCode,
      template.templateType,
      template.status,
      template.data,
      JSON.stringify(template.containerMeta),
      template.createdOn,
      template.modifiedOn
    ];

    await pool.execute(insertQuery, values);

    return res.status(200).json({
      success: true,
      templateId: template.id,
      response: template
    });

  } catch (error) {
    console.error('Template creation error:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
      details: error.response?.data
    });
  }
};
