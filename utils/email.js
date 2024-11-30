const nodemailer = require("nodemailer");

// Create a transporter using Gmail's SMTP settings
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  secure: true,
});

// Function to send email
const sendEmail = async (to, subject, text) => {
  try {
    // Send email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER, // Sender's email
      to, // Recipient's email
      subject,
      text,
    });

    console.log("Email sent: " + info.response);
  } catch (error) {
    console.error("Error sending email: ", error);
    throw new Error("Failed to send email");
  }
};

module.exports = sendEmail;
