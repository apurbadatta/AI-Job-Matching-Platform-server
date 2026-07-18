import { Router, Request, Response } from "express";
import { ContactMessage } from "../models/ContactMessage";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (typeof name !== "string" || typeof email !== "string" || typeof subject !== "string" || typeof message !== "string") {
      return res.status(400).json({ error: "Invalid field types" });
    }

    if (name.length > 100 || subject.length > 200 || message.length > 5000) {
      return res.status(400).json({ error: "Input too long" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    const contactMessage = await ContactMessage.create({
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
    });

    res.status(201).json({
      success: true,
      message: "Your message has been sent successfully. We will get back to you within 24 hours.",
      id: contactMessage._id,
    });
  } catch (error: any) {
    console.error("Contact form error:", error);
    res.status(500).json({ error: "Failed to send message. Please try again later." });
  }
});

export default router;
