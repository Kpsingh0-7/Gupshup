// Optimized Webhook Handler (with points 1 to 7 applied, WebSocket logic unchanged)

import { handleReply } from "../controllers/chat/replyController.js";
import { updateCreditUsage } from "../controllers/updateCreditUsage.js";
import { pool } from "../config/db.js";
import fs from "fs/promises";
import path from "path";

export function createWebhookHandler(io) {
  return async function handleWebhook(req, res) {
    const webhookData = JSON.stringify(req.body, null, 2);
    const filePath = path.join(process.cwd(), "webhook.txt");
    const logEntry = `\n\n=== Webhook Received at ${new Date().toISOString()} ===\n${webhookData}\n`;

    // Log webhook asynchronously
    fs.appendFile(filePath, logEntry).catch(console.error);

    // Respond immediately
    res.status(200).json({ success: true });

    try {
      const messages = req.body.entry?.[0]?.changes || [];
      const gsAppId = req.body.gs_app_id;

      for (const change of messages) {
        const value = change.value;

        // Parallelize status and message processing
        await Promise.all([
          handleStatusUpdates(value?.statuses),
          handleIncomingMessage(value, gsAppId, io)
        ]);
      }
    } catch (err) {
      console.error("Error in webhook logic:", err);
    }
  };
}

async function handleStatusUpdates(statuses = []) {
  const statusPriority = { sent: 1, delivered: 2, read: 3 };

  for (const { gs_id, status } of statuses) {
    const [existing] = await pool.query(
      `SELECT status FROM messages WHERE external_message_id = ?`,
      [gs_id]
    );

    if (existing.length) {
      const currentStatus = existing[0].status;
      if (currentStatus !== "read" && (!statusPriority[currentStatus] || statusPriority[status] > statusPriority[currentStatus])) {
        await pool.query(
          `UPDATE messages 
           SET status = ?, 
               delivered_at = IF(? = 'delivered', NOW(), delivered_at),
               read_at = IF(? = 'read', NOW(), read_at)
           WHERE external_message_id = ?`,
          [status, status, status, gs_id]
        );
        console.log(`Updated status for ${gs_id}`);
      }
    } else {
      console.warn(`No message found for status: ${gs_id}`);
    }
  }
}

async function handleIncomingMessage(value, gsAppId, io) {
  const msg = value?.messages?.[0];
  if (!msg) return;

  const customerNumber = msg.from;
  const mobile_no = customerNumber.slice(-10);
  const country_code = customerNumber.slice(0, customerNumber.length - 10);
  const customerName = value.contacts?.[0]?.profile?.name || "Unknown";

  const [configRows] = await pool.query(
    `SELECT customer_id FROM gupshup_configuration WHERE gupshup_id = ?`,
    [gsAppId]
  );
  if (configRows.length === 0) throw new Error("Shop not found");

  const customer_id = configRows[0].customer_id;

  // Check or insert contact
  const [guestRows] = await pool.query(
    `SELECT contact_id FROM contact WHERE mobile_no = ? AND customer_id = ?`,
    [mobile_no, customer_id]
  );

  let contact_id;
  if (guestRows.length === 0) {
    const [insertGuest] = await pool.query(
      `INSERT INTO contact (first_name, mobile_no, country_code, customer_id) VALUES (?, ?, ?, ?)`,
      [customerName, mobile_no, country_code, customer_id]
    );
    contact_id = insertGuest.insertId;
  } else {
    contact_id = guestRows[0].contact_id;
  }

  const [convRows] = await pool.query(
    `SELECT conversation_id FROM conversations WHERE contact_id = ? AND customer_id = ?`,
    [contact_id, customer_id]
  );

  let conversation_id;
  if (convRows.length === 0) {
    const [insertConv] = await pool.query(
      `INSERT INTO conversations (contact_id, customer_id, is_active) VALUES (?, ?, 1)`,
      [contact_id, customer_id]
    );
    conversation_id = insertConv.insertId;
  } else {
    conversation_id = convRows[0].conversation_id;
    await pool.query(
      `UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE conversation_id = ?`,
      [conversation_id]
    );
  }

  const messageId = msg.id;
  const timestamp = msg.timestamp;
  let messageText = "No text";
  let mediaUrl = null;

  switch (msg.type) {
    case "text": messageText = msg.text?.body; break;
    case "image": mediaUrl = msg.image?.url; messageText = "📷 Image received"; break;
    case "video": mediaUrl = msg.video?.url; messageText = "📹 Video received"; break;
    case "audio": mediaUrl = msg.audio?.url; messageText = "🔊 Audio received"; break;
    case "document": mediaUrl = msg.document?.url; messageText = msg.document?.filename; break;
    case "sticker": mediaUrl = msg.sticker?.url; messageText = "🧃 Sticker received"; break;
    case "button": messageText = msg.button?.text; break;
    default: messageText = "Unsupported message type"; console.warn("Unsupported type:", msg.type);
  }

  const [existingMessage] = await pool.query(
    `SELECT message_id FROM messages WHERE external_message_id = ?`,
    [messageId]
  );

  if (existingMessage.length === 0) {
    await pool.query(
      `INSERT INTO messages (
        conversation_id, sender_type, sender_id, message_type, content, media_url, received_at, status, external_message_id
      ) VALUES (?, 'guest', ?, ?, ?, ?, FROM_UNIXTIME(?), 'received', ?)`,
      [
        conversation_id,
        contact_id,
        msg.type,
        messageText,
        mediaUrl,
        timestamp,
        messageId,
      ]
    );

    await updateCreditUsage(customer_id, "received");

    const newMessage = {
      conversation_id,
      sender_type: "guest",
      sender_id: contact_id,
      message_type: msg.type,
      content: messageText,
      media_url: mediaUrl,
      sent_at: new Date(timestamp * 1000).toISOString(),
      status: "received",
      external_message_id: messageId,
    };

    // ✅ WebSocket logic unchanged
    io.to(String(conversation_id)).emit("newMessage", newMessage);
    console.log(`Emitted to room ${conversation_id}`, newMessage);

    // ✅ Emit to toast notification
    io.to(String(customer_id)).emit("newMessageAlert", {
      contact_id,
      conversation_id,
      name: customerName,
      content: messageText,
      type: msg.type,
      time: newMessage.sent_at,
    });
    console.log(`🔔 Emitted newMessageAlert to customer ${customer_id}`);
  } else {
    console.log(`Message already exists: ${messageId}`);
  }

  // Defer reply logic
  setImmediate(() => {
    handleReply({
      from: customerNumber,
      message: messageText,
      payload: msg.button?.payload || null,
      timestamp: timestamp,
      contact_id: contact_id,
      customer_id: customer_id,
    }).catch(err => console.error("handleReply error:", err));
  });
}
