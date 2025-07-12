import axios from 'axios';

export const getTemplateAnalytics = async (req, res) => {
  const {
    start,
    end,
    granularity = 'AGGREGATED',
    metric_types = 'SENT,DELIVERED,READ,CLICKED',
    template_id,
    limit = 30,
  } = req.query;

  if (!template_id) {
    return res
      .status(400)
      .json({ error: 'Missing required parameter: template_id' });
  }

  try {
    const params = new URLSearchParams({
      ...(start && { start }),
      ...(end && { end }),
      granularity,
      metric_types,
      template_ids: template_id,
      limit,
    });

    const url = `https://partner.gupshup.io/partner/app/7f97d76e-d64a-4c7b-b589-7b607dce5b45/template/analytics?${params.toString()}`;

    const response = await axios.get(url, {
      headers: {
        Authorization: 'sk_4ac0a398aa5f4cca963974904ef1f3', // or use process.env.TOKEN
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching template analytics:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Internal Server Error',
    });
  }
};
