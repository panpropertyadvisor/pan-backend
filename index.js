import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { Resend } from "resend";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post("/send-code", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const otp = generateOTP();

    await resend.emails.send({
      from: "PAN Property Advisor <no-reply@yourdomain.com>",
      to: email,
      subject: "Your Verification Code",
      html: `<h2>${otp}</h2><p>This code expires in 10 minutes.</p>`
    });

    return res.json({ success: true, otp });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
});

app.get("/", (req, res) => {
  res.send("PAN Property Advisor Backend Running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));