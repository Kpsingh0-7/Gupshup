import { pool } from "../../config/db.js";
import { sendBroadcast } from "./sendBroadcast.js";

export const getBroadcastCustomers = async (req, res) => {
  const {
    customer_id,
    broadcastName,
    customerList,
    messageType,
    schedule,
    scheduleDate,
    selectedTemplate = {},
    status,
    type,
  } = req.body;
  console.log(req.body);
  const broadcast_name = broadcastName;
  const group_name = customerList;
  const element_name = selectedTemplate?.element_name || "";
  const template_id = selectedTemplate?.id;

  try {
    if (!broadcast_name || !group_name || !element_name) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: broadcast_name, group_name, or element_name.",
      });
    }

    // Save broadcast
    const [insertResult] = await pool.execute(
      `INSERT INTO broadcasts 
        (customer_id,broadcast_name, customer_list, message_type, schedule, schedule_date, status, type, selected_template, template_id)
       VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer_id,
        broadcastName,
        customerList,
        messageType,
        schedule,
        schedule === "Yes" ? new Date(scheduleDate) : null,
        status,
        type,
        element_name,
        template_id,
      ]
    );
    const broadcast_id = insertResult.insertId;

    if (schedule === "Yes") {
      // Scheduled: Do not send now
      return res.status(200).json({
        success: true,
        message: "Broadcast scheduled successfully",
        broadcast_id,
      });
    }

    // Immediate: Fetch and send
    const [groupRows] = await pool.execute(
  `SELECT group_id FROM contact_group WHERE group_name = ? AND customer_id = ?`,
  [group_name, customer_id]
);


    if (groupRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Group '${group_name}' not found.`,
      });
    }

    const group_id = groupRows[0].group_id;

    const [customerMapRows] = await pool.execute(
      `SELECT contact_id FROM contact_group_map WHERE group_id = ?`,
      [group_id]
    );

    const customerIds = customerMapRows.map((row) => row.contact_id);

    if (customerIds.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No customers found for group '${group_name}'.`,
      });
    }

    const placeholders = customerIds.map(() => "?").join(", ");
    const [mobileRows] = await pool.execute(
      `SELECT contact_id,country_code, mobile_no FROM contact WHERE contact_id IN (${placeholders})`,
      customerIds
    );

    const formattedPhoneNumbers = mobileRows.map(
      ({ country_code, mobile_no }) => `${country_code}${mobile_no}`
    );

    const fakeRequest = {
      body: {
        phoneNumbers: formattedPhoneNumbers,
        element_name: element_name,
        customer_id:customer_id,
      },
    };
    const fakeResponse = {
      status: (code) => ({
        json: (data) => console.log(`Response (${code}):`, data),
      }),
    };

    await sendBroadcast(fakeRequest, fakeResponse);

    // Mark as completed
    await pool.execute(
      `UPDATE broadcasts SET status = ? WHERE broadcast_id = ?`,
      ["Sent", broadcast_id]
    );

    return res.status(200).json({
      success: true,
      broadcast_name,
      group_name,
      element_name,
      mobile_numbers: mobileRows,
      message: "Broadcast sent successfully",
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// 🔁 Background Scheduler for Scheduled Broadcasts (runs once every 60 seconds)
const sendBroadcastById = async (broadcast_id) => {
  try {
    const [rows] = await pool.execute(`SELECT * FROM broadcasts WHERE broadcast_id = ?`, [broadcast_id]);
    if (!rows.length) return;
    const broadcast = rows[0];

    const [groupRows] = await pool.execute(
  `SELECT group_id FROM contact_group WHERE group_name = ? AND customer_id = ?`,
  [group_name, customer_id]
);

    if (!groupRows.length) return;
    const group_id = groupRows[0].group_id;

    const [customerMapRows] = await pool.execute(
      `SELECT contact_id FROM contact_group_map WHERE group_id = ?`,
      [group_id]
    );
    const customerIds = customerMapRows.map((r) => r.contact_id);
    if (!customerIds.length) return;

    const placeholders = customerIds.map(() => "?").join(", ");
    const [mobileRows] = await pool.execute(
      `SELECT country_code, mobile_no FROM contact WHERE contact_id IN (${placeholders})`,
      customerIds
    );
    const phoneNumbers = mobileRows.map(
      ({ country_code, mobile_no }) => `${country_code}${mobile_no}`
    );

    const fakeRequest = {
      body: {
        phoneNumbers,
        element_name: broadcast.selected_template,
      },
    };
    const fakeResponse = {
      status: (code) => ({
        json: (data) => console.log(`Response (${code}):`, data),
      }),
    };

    await sendBroadcast(fakeRequest, fakeResponse);
  } catch (error) {
    console.error("❌ sendBroadcastById error:", error);
  }
};

// Run every 1 minute to check for scheduled broadcasts
setInterval(async () => {
  try {
    const [scheduledBroadcasts] = await pool.execute(`
      SELECT * FROM broadcasts
      WHERE schedule = 'Yes' 
        AND status = 'Scheduled' 
        AND schedule_date <= NOW()
    `);

    for (const broadcast of scheduledBroadcasts) {
      try {
        await pool.execute(`UPDATE broadcasts SET status = 'Running' WHERE broadcast_id = ?`, [
          broadcast.broadcast_id,
        ]);

        await sendBroadcastById(broadcast.broadcast_id);

        await pool.execute(`UPDATE broadcasts SET status = 'Sent' WHERE broadcast_id = ?`, [
          broadcast.broadcast_id,
        ]);
      } catch (err) {
        console.error("🔁 Scheduled broadcast failed:", err);
        await pool.execute(`UPDATE broadcasts SET status = 'Failed' WHERE broadcast_id = ?`, [
          broadcast.broadcast_id,
        ]);
      }
    }
  } catch (error) {
    console.error("❌ Scheduler interval error:", error);
  }
}, 60 * 1000);
