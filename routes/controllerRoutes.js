import { Router } from "express";
import multer from "multer";
import { authenticateToken } from "../middleware/authenticateToken.js";
import { createWebhookHandler } from "../webhooks/webhook.js";

// Controllers that don't need io
import { getTemplate } from "../controllers/template/getTemplate.js";
import { sendTemplate } from "../controllers/chat/sendTemplate.js";
import { sendTemplates } from "../controllers/chat/sendTemplates.js";
import { createTemplate } from "../controllers/template/createTemplate.js";
import { deleteTemplate } from "../controllers/template/deleteTemplate.js";
import { updateTemplate } from "../controllers/template/editTemplate.js";
import { setupSubscription } from "../controllers/template/setSubscription.js";
import { addBulkContacts } from "../controllers/contact/addBulkContacts.js";
import { sendBroadcast } from "../controllers/broadcast/sendBroadcast.js";
import { getBroadcastCustomers } from "../controllers/broadcast/getBroadcastCustomers.js";
import { getBroadcasts } from "../controllers/broadcast/getBroadcasts.js";
import { getTemplateAnalytics } from "../controllers/template/getTemplateAnalytics.js";
import { loginUser, getMe, logoutUser } from "../controllers/login.js";

// Controllers that require io passed (factories)
import { returnTemplates } from "../controllers/chat/returnTemplates.js";
import { returnMessages } from "../controllers/chat/returnMessages.js";
import { returnGroups } from "../controllers/broadcast/returnGroups.js";
import { returnContacts } from "../controllers/contact/returnContacts.js";
import { returnConversationId } from "../controllers/chat/returnConversationId.js";
import { returnConversations } from "../controllers/chat/returnConversations.js";
import { markMessagesAsRead } from "../controllers/chat/markMessagesAsRead.js";
import { returnCustomerCreditUsage } from "../controllers/returnCustomerCreditUsage.js";

// Controllers you renamed with _ prefix (if needed)
import { addSingleContact } from "../controllers/contact/addSingleContact.js";
import { processConversationMessage } from "../controllers/chat/processConversationMessage.js";
import { updateContact } from "../controllers/contact/updateContact.js";
import { deleteContact } from "../controllers/contact/deleteContact.js";
import { deleteConversations } from "../controllers/chat/deleteConversations.js";
import { createRazorpayOrder, verifyRazorpayPayment } from '../controllers/payment/payment.js';


const router = Router();
const upload = multer({ dest: "uploads/" });

export default function createRouter(io) {
  // Public Routes

  router.post("/webhook", createWebhookHandler(io));

  // Protected Routes (Requires JWT)
  router.post("/login", loginUser);
  router.post('/create-payment', createRazorpayOrder);
router.post('/verify-payment', verifyRazorpayPayment);
  router.post("/send", sendTemplate);
  router.post("/sendTemplates", sendTemplates);
  router.post("/subscription", setupSubscription);
  router.post("/createtemplate", createTemplate);
  router.post("/sendmessage", processConversationMessage);
  router.post("/addcustomer", addSingleContact);
  router.post("/addcustomers", upload.single("file"), addBulkContacts);
  router.post("/sendBroadcast", sendBroadcast);
  router.post("/getBroadcastCustomers", getBroadcastCustomers);
    router.post("/markMessagesAsRead", markMessagesAsRead);

  router.post("/logout", logoutUser);

  router.delete("/deletetemplate", authenticateToken, deleteTemplate);
  router.put("/edit", authenticateToken, updateTemplate);
  router.put("/updatecontact", authenticateToken, updateContact);
  router.delete("/deletecontact", authenticateToken, deleteContact);
  router.delete("/deleteconversations", deleteConversations);

  router.get("/me", authenticateToken, getMe);
  router.get("/gettemplates", authenticateToken, getTemplate);
  router.get("/contacts", authenticateToken, returnContacts);
  router.get("/templates", authenticateToken, returnTemplates);
  router.get("/conversations", authenticateToken, returnConversations);
  router.get("/messages", returnMessages);
  router.get("/conversationid", authenticateToken, returnConversationId);
  router.get("/returnGroups", authenticateToken, returnGroups);
  router.get("/getBroadcasts", authenticateToken, getBroadcasts);
  router.get("/getTemplateAnalytics", getTemplateAnalytics);
  router.get("/creditUsage", authenticateToken, returnCustomerCreditUsage);

  return router;
}
