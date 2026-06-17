import express from "express";
import cors from "cors";
import { Resend } from "resend";
import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Force HTTPS on Render
app.use((req, res, next) => {
  if (req.headers["x-forwarded-proto"] !== "https") {
    return res.redirect("https://" + req.headers.host + req.url);
  }
  next();
});

-------------------------
// RESEND + STRIPE
// -----------------------------
const resend = new Resend(process.env.RESEND_API_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// -----------------------------
// OTP STORE
// -----------------------------
const otpStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// -----------------------------
// SEND OTP
// -----------------------------
app.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const otp = generateOTP();

    otpStore[email] = {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
    };

    await resend.emails.send({
      from: "PAN Property Advisor <no-reply@panpropertyadvisor.com.au>",
      to: email,
      subject: "Your Verification Code",
      html: `<h2>${otp}</h2><p>This code expires in 10 minutes.</p>`,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// -----------------------------
// VERIFY OTP
// -----------------------------
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: "Email and OTP are required" });
  }

  const record = otpStore[email];

  if (!record) {
    return res.status(400).json({ success: false, message: "No OTP found for this email" });
  }

  if (Date.now() > record.expiresAt) {
    delete otpStore[email];
    return res.status(400).json({ success: false, message: "OTP expired" });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ success: false, message: "Invalid OTP" });
  }

  delete otpStore[email];
  return res.json({ success: true, message: "OTP verified successfully" });
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
      amount,
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
// START SERVER
// -----------------------------
app.listen(3000, () => console.log("Backend running on port 3000"));
