import Razorpay from 'razorpay';
import crypto from 'crypto';
import { pool } from '../../config/db.js'; // adjust this if needed

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay Order
export const createRazorpayOrder = async (req, res) => {
  const { amount, customer_id } = req.body;

  if (!amount || !customer_id) {
    return res.status(400).json({ success: false, error: "Amount and customer_id are required" });
  }

  try {
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    });

    // Save to DB
    await pool.execute(
      `INSERT INTO payments (order_id, customer_id, amount, currency, receipt, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        order.id,
        customer_id,
        amount,
        order.currency,
        order.receipt,
        order.status || 'created',
      ]
    );

    res.json({ success: true, order });
  } catch (err) {
    console.error("Error creating Razorpay order:", err);
    res.status(500).json({ success: false, error: "Failed to create order" });
  }
};

// Verify Razorpay Payment
export const verifyRazorpayPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, error: "Missing payment details" });
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Invalid signature' });
  }

  try {
    // Step 1: Update payment status
    await pool.execute(
      `UPDATE payments SET status = ?, razorpay_payment_id = ? WHERE order_id = ?`,
      ['paid', razorpay_payment_id, razorpay_order_id]
    );

    // Step 2: Get amount and customer_id
    const [paymentResult] = await pool.execute(
      `SELECT amount, customer_id FROM payments WHERE order_id = ?`,
      [razorpay_order_id]
    );

    if (paymentResult.length === 0) {
      return res.status(404).json({ success: false, error: "Payment record not found" });
    }

    const { amount, customer_id } = paymentResult[0];

    // Step 3: Update `customer` table
    await pool.execute(
      `UPDATE customer SET 
        total_credit = total_credit + ?, 
        total_credit_remaining = total_credit_remaining + ?
      WHERE customer_id = ?`,
      [amount, amount, customer_id]
    );

    // Step 4: Update `customer_credit_usage` table
    await pool.execute(
      `UPDATE customer_credit_usage SET 
        credit_remaining = credit_remaining + ?
      WHERE customer_id = ?`,
      [amount, customer_id]
    );

    return res.json({ success: true, message: 'Payment verified and credits updated successfully' });
  } catch (dbErr) {
    console.error("Error updating credit info:", dbErr);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};
