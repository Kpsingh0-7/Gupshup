import { pool } from "../../config/db.js";
import cron from "node-cron";
import axios from "axios";


const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// 🔁 Function to update broadcast analytics in the background (for cron)
export const updateBroadcastAnalytics = async () => {
  console.log(
    `[${new Date().toISOString()}] 📊 Starting broadcast analytics update...`
  );

  const [broadcasts] = await pool.execute(`
    SELECT 
      broadcast_id,
      template_id,
      sent,
      delivered,
      \`read\`,
      clicked,
      updated_at,
      created_at
    FROM broadcasts
    WHERE template_id IS NOT NULL
    ORDER BY created_at DESC
  `);

  console.log(`📥 Total broadcasts fetched: ${broadcasts.length}`);

  for (const broadcast of broadcasts) {
    try {
      

      const params = new URLSearchParams({
        start: "", // intentionally blank
        end: "", // intentionally blank
        granularity: "AGGREGATED",
        metric_types: "SENT,DELIVERED,READ,CLICKED",
        template_ids: broadcast.template_id,
        limit: 30,
      });

      const url = `https://partner.gupshup.io/partner/app/7f97d76e-d64a-4c7b-b589-7b607dce5b45/template/analytics?${params.toString()}`;

      const response = await axios.get(url, {
        headers: {
          Authorization: "sk_4ac0a398aa5f4cca96d53974904ef1f3",
        },
      });

      const analytics = response.data?.template_analytics?.[0];
      if (!analytics) {
        console.log(
          `ℹ️ No analytics data for template_id ${broadcast.template_id}`
        );
        continue;
      }

      const clickedArray = analytics.clicked || [];
      const totalClicked = clickedArray.reduce(
        (sum, btn) => sum + (btn.count || 0),
        0
      );

      console.log(`📦 Broadcast ID: ${broadcast.broadcast_id}`);
      console.log(
        `🔢 Before - Sent: ${broadcast.sent}, Delivered: ${broadcast.delivered}, Read: ${broadcast.read}, Clicked: ${broadcast.clicked}`
      );
      console.log(
        `📥 New - Sent: ${analytics.sent || 0}, Delivered: ${
          analytics.delivered || 0
        }, Read: ${analytics.read || 0}, Clicked: ${totalClicked}`
      );
      console.log(
        `📊 After - Sent: ${
          broadcast.sent + (analytics.sent || 0)
        }, Delivered: ${
          broadcast.delivered + (analytics.delivered || 0)
        }, Read: ${broadcast.read + (analytics.read || 0)}, Clicked: ${
          broadcast.clicked + totalClicked
        }`
      );

      await pool.execute(
        `UPDATE broadcasts 
         SET sent = sent + ?, delivered = delivered + ?, \`read\` = \`read\` + ?, clicked = clicked + ?, updated_at = NOW()
         WHERE broadcast_id = ?`,
        [
          analytics.sent || 0,
          analytics.delivered || 0,
          analytics.read || 0,
          totalClicked,
          broadcast.broadcast_id,
        ]
      );

      console.log(`✅ Updated broadcast_id ${broadcast.broadcast_id}\n`);
       await sleep(60000);
    } catch (err) {
      console.error(
        `❌ Failed for broadcast_id ${broadcast.broadcast_id}:`,
        err.message
        
      );
       await sleep(60000);
    }
  }

  console.log(
    `[${new Date().toISOString()}] ✅ Broadcast analytics update completed.`
  );
};

// 🚀 Express route handler to fetch broadcasts
export const getBroadcasts = async (req, res) => {
  try {
    const { customer_id } = req.query; // or use req.body if sent in body

    if (!customer_id) {
      return res.status(400).json({
        success: false,
        message: "Missing customer_id",
      });
    }

    const [broadcasts] = await pool.execute(
      `
      SELECT 
        broadcast_id,
        broadcast_name,
        customer_list,
        message_type,
        schedule,
        schedule_date,
        status,
        type,
        selected_template,
        template_id,
        created_at,
        sent,
        delivered,
        \`read\`,
        clicked,
        updated_at
      FROM broadcasts
      WHERE customer_id = ?
      ORDER BY created_at DESC
    `,
      [customer_id]
    );

    return res.status(200).json({
      success: true,
      broadcasts,
    });
  } catch (error) {
    console.error("❌ Error fetching broadcasts:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


// ⏱ Cron job to update analytics Run once every day at midnight (12:00 AM).
cron.schedule("0 0 * * *", async () => {
  console.log(
    `[${new Date().toISOString()}] 🕒 Running broadcast analytics update task...`
  );
  try {
    await updateBroadcastAnalytics();
    console.log(
      `[${new Date().toISOString()}] ✅ Broadcast analytics updated successfully.`
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ❌ Error in cron job:`,
      error.message
    );
  }
});
