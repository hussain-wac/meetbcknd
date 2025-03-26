const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const transporter = nodemailer.createTransport({
  secure: true,
  host: 'smtp.gmail.com',
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

console.log('Email User:', process.env.EMAIL_USER);
console.log('Email Pass:', process.env.EMAIL_PASS ? 'Loaded' : 'Not Loaded');

const sendEmail = async (to, subject, templateName, templateVars) => {
  try {
    // Load the specific email template
    let templatePath = path.join(__dirname, `templates/${templateName}.html`);
    let template = fs.readFileSync(templatePath, 'utf-8');

    // Replace placeholders with actual data
    for (const key in templateVars) {
      template = template.replace(new RegExp(`{{${key}}}`, 'g'), templateVars[key]);
    }

    const mailOptions = {
      from: `Wacspace <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: template,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
  }
};

module.exports = sendEmail;
