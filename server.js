import express from "express";
import cors from "cors";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);

// Temporary in-memory OTP store
const otpStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const otp = generateOTP();
    otpStore[email] = otp;

    await resend.emails.send({
      from: "PAN Property Advisor <no-reply@panpropertyadvisor.com.au>",
      to: email,
      subject: "Your Verification Code",
      html: `<h2>${otp}</h2><p>This code expires in 10 minutes.</p>`
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (otpStore[email] === otp) {
    delete otpStore[email];
    return res.json({ success: true });
  }

  res.status(400).json({ success: false, error: "Invalid OTP" });
});

app.listen(3000, () => console.log("Backend running on port 3000"));
