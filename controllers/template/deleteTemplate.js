import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

export const deleteTemplate = async (req, res) => {
  const { templateName } = req.body; // Get template name from URL params

  try {
    // Validate input
    if (!templateName) {
      return res.status(400).json({
        success: false,
        error: "Template name is required",
      });
    }

    const response = await axios.delete(
      `https://partner.gupshup.io/partner/app/7f97d76e-d64a-4c7b-b589-7b607dce5b45/template/${templateName}`,
      {
        headers: {
          accept: "application/json",
          Authorization: "sk_4ac0a398aa5f4cca96d53974904ef1f3",
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Template deleted successfully",
      data: response.data,
    });
  } catch (error) {
    console.error(
      "Error deleting template:",
      error.response?.data || error.message
    );

    return res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
};