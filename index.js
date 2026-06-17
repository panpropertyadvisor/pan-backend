import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { Resend } from "resend";
import Stripe from "stripe";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// -----------------------------
// SIMPLE IN-MEMORY OTP STORE
// -----------------------------
const otpStore = {}; // { email: { otp: "123456", expires: 123456789 } }

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// -----------------------------
// SEND OTP
// -----------------------------
app.post("/send-code", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const otp = generateOTP();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore[email] = { otp, expires };

    await resend.emails.send({
      from: "PAN Property Advisor <no-reply@yourdomain.com>",
      to: email,
      subject: "Your Verification Code",
      html: `<h2>${otp}</h2><p>This code expires in 10 minutes.</p>`
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
});

// -----------------------------
// VERIFY OTP
// -----------------------------
app.post("/verify-code", (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  const record = otpStore[email];

  if (!record) {
    return res.status(400).json({ error: "No OTP found for this email" });
  }

  if (Date.now() > record.expires) {
    delete otpStore[email];
    return res.status(400).json({ error: "OTP expired" });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ error: "Invalid OTP" });
  }

  delete otpStore[email]; // OTP used once

  return res.json({ success: true });
});

// -----------------------------
// STRIPE PAYMENT INTENT
// -----------------------------
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "aud",
      automatic_payment_methods: { enabled: true },
    });

    return res.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("PaymentIntent error:", error);
    return res.status(500).json({ error: "PaymentIntent creation failed" });
  }
});

// -----------------------------
// ROOT ROUTE
// -----------------------------
app.get("/", (req, res) => {
  res.send("PAN Property Advisor Backend Running");
});

// ROOT ROUTE (HERE)
app.get("/", (req, res) => {
  res.send("PAN Property Advisor Backend Running");
});

// -----------------------------
// START SERVER (Render compatible)
// -----------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
