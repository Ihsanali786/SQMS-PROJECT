// backend/utils/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendTurnAlert = async (email, tokenNumber, waitTime) => {
  await transporter.sendMail({
    from: 'noreply@smartqueue.com',
    to: email,
    subject: 'Your Turn is Almost Here!',
    html: `<h3>Token ${tokenNumber}</h3><p>Your turn is in ${waitTime} minutes</p>`
  });
};