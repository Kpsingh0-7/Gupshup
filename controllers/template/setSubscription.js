import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export const setupSubscription = async (req, res) => {
  const {
    modes = "SENT, READ, DELIVERED, ALL, TEMPLATE", // SENT, READ, DELIVERED,
    tag = "FoodChowApp_v6",
    url = "http://195.201.175.72:3000/we",
    version = 3,
    showOnUI = false,
    meta = null,
  } = req.body;

  try {
    // Validate required fields
    if (!url) {
      return res.status(400).json({
        success: false,
        error: "Webhook URL is required",
      });
    }

    const encodedParams = new URLSearchParams();
    encodedParams.set("modes", modes);
    encodedParams.set("tag", tag);
    encodedParams.set("url", url);
    encodedParams.set("version", version.toString());
    encodedParams.set("showOnUI", showOnUI.toString());
    if (meta) encodedParams.set("meta", JSON.stringify(meta));

    const response = await axios.post(
      `https://partner.gupshup.io/partner/app/7f97d76e-d64a-4c7b-b589-7b607dce5b45/subscription`,
      encodedParams.toString(),
      {
        headers: {
          Authorization: "sk_4ac0a398aa5f4cca96d53974904ef1f3",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return res.status(200).json({
      success: true,
      subscription: response.data.subscription,
    });
  } catch (error) {
    console.error("Subscription error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || "Failed to setup subscription",
      details: error.response?.data,
    });
  }
};