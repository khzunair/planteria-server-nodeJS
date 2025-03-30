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

// Function to send plain text email
const sendEmail = async (to, subject, text) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    });

    console.log("Text Email sent: " + info.response);
  } catch (error) {
    console.error("Error sending text email: ", error);
    throw new Error("Failed to send email");
  }
};

// Function to send HTML email (Order Confirmation)
const sendOrderConfirmationEmail = async (to, subject, htmlContent) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: htmlContent, // Sending HTML content
    });

    console.log("HTML Email sent: " + info.response);
  } catch (error) {
    console.error("Error sending HTML email:", error);
    throw new Error("Failed to send email");
  }
};

// Export both functions
module.exports = { sendEmail, sendOrderConfirmationEmail };
