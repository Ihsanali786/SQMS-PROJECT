// backend/services/notificationService.js
const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Email configuration
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// SMS configuration (Twilio)
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

class NotificationService {
  
  // Send email notification
  async sendEmail(to, subject, template, data) {
    try {
      const html = this.renderTemplate(template, data);
      await emailTransporter.sendMail({
        from: `"Smart Queue System" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html
      });
      console.log(`📧 Email sent to ${to}`);
      return true;
    } catch (error) {
      console.error('Email error:', error);
      return false;
    }
  }
  
  // Send SMS notification
  async sendSMS(to, message) {
    try {
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to
      });
      console.log(`📱 SMS sent to ${to}`);
      return true;
    } catch (error) {
      console.error('SMS error:', error);
      return false;
    }
  }
  
  // Token generated notification
  async notifyTokenGenerated(user, token, branch) {
    const subject = 'Your Token Has Been Generated';
    const data = { user, token, branch };
    
    await this.sendEmail(user.email, subject, 'token-generated', data);
    
    if (user.phone) {
      const message = `Smart Queue: Your token ${token.tokenNumber} at ${branch.name}. ${token.position} people ahead. Est wait: ${token.estimatedWaitTime} min.`;
      await this.sendSMS(user.phone, message);
    }
  }
  
  // Turn alert notification
  async notifyTurnAlert(user, token, branch, counterNumber) {
    const subject = '⚠️ Your Turn is Almost Here!';
    const data = { user, token, branch, counterNumber };
    
    await this.sendEmail(user.email, subject, 'turn-alert', data);
    
    if (user.phone) {
      const message = `Smart Queue: Your turn for ${token.service} is NEXT! Please proceed to Counter ${counterNumber} at ${branch.name}.`;
      await this.sendSMS(user.phone, message);
    }
  }
  
  // Appointment reminder
  async notifyAppointmentReminder(user, appointment) {
    const subject = 'Appointment Reminder - Tomorrow';
    const data = { user, appointment };
    
    await this.sendEmail(user.email, subject, 'appointment-reminder', data);
    
    if (user.phone) {
      const message = `Reminder: Your appointment for ${appointment.service} at ${appointment.branchName} is tomorrow at ${appointment.time}. Token: ${appointment.tokenNumber}`;
      await this.sendSMS(user.phone, message);
    }
  }
  
  // Queue position update
  async notifyQueuePosition(user, token, position, waitTime) {
    if (position === 5 || position === 2 || position === 1) {
      const message = `Smart Queue: Your position is now #${position}. Estimated wait: ${waitTime} minutes.`;
      await this.sendSMS(user.phone, message);
    }
  }
  
  // Render email templates
  renderTemplate(template, data) {
    const templates = {
      'token-generated': `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white;">🎫 Your Token is Ready</h1>
          </div>
          <div style="padding: 20px; background: #f9f9f9;">
            <p>Dear <strong>${data.user.name}</strong>,</p>
            <p>Your token has been generated successfully for <strong>${data.token.service}</strong> at <strong>${data.branch.name}</strong>.</p>
            <div style="background: white; padding: 15px; border-radius: 10px; margin: 20px 0;">
              <h2 style="color: #667eea; text-align: center;">${data.token.tokenNumber}</h2>
              <p><strong>📍 Branch:</strong> ${data.branch.name}, ${data.branch.city}</p>
              <p><strong>📅 Date:</strong> ${new Date(data.token.date).toLocaleDateString()} at ${data.token.time}</p>
              <p><strong>👥 People Ahead:</strong> ${data.token.position}</p>
              <p><strong>⏱️ Est. Wait:</strong> ${data.token.estimatedWaitTime} minutes</p>
            </div>
            <p>You will receive another notification when your turn is near.</p>
            <hr style="margin: 20px 0;" />
            <p style="color: #666; font-size: 12px;">Smart Queue System - Reducing wait times across Pakistan</p>
          </div>
        </div>
      `,
      
      'turn-alert': `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; text-align: center;">
            <h1 style="color: white;">🔔 Your Turn is Next!</h1>
          </div>
          <div style="padding: 20px; background: #f9f9f9;">
            <p>Dear <strong>${data.user.name}</strong>,</p>
            <p><strong style="color: #f5576c;">⚠️ Your turn is almost here!</strong></p>
            <div style="background: white; padding: 15px; border-radius: 10px; margin: 20px 0;">
              <p><strong>🎫 Token:</strong> ${data.token.tokenNumber}</p>
              <p><strong>🏢 Counter:</strong> ${data.counterNumber}</p>
              <p><strong>📍 Branch:</strong> ${data.branch.name}</p>
            </div>
            <p>Please proceed to the counter immediately. Don't miss your turn!</p>
            <div style="background: #e8f5e9; padding: 10px; border-radius: 5px; margin-top: 20px;">
              <p style="margin: 0; color: #2e7d32;">✅ Please be ready with your QR code or token number.</p>
            </div>
          </div>
        </div>
      `,
      
      'appointment-reminder': `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; text-align: center;">
            <h1 style="color: white;">📅 Appointment Reminder</h1>
          </div>
          <div style="padding: 20px; background: #f9f9f9;">
            <p>Dear <strong>${data.user.name}</strong>,</p>
            <p>This is a reminder for your appointment <strong>tomorrow</strong>.</p>
            <div style="background: white; padding: 15px; border-radius: 10px; margin: 20px 0;">
              <p><strong>🎫 Token:</strong> ${data.appointment.tokenNumber}</p>
              <p><strong>🏦 Service:</strong> ${data.appointment.service}</p>
              <p><strong>📅 Date:</strong> ${data.appointment.date}</p>
              <p><strong>⏰ Time:</strong> ${data.appointment.time}</p>
              <p><strong>📍 Branch:</strong> ${data.appointment.branchName}</p>
            </div>
            <p>Please arrive 10 minutes before your scheduled time.</p>
          </div>
        </div>
      `
    };
    
    return templates[template] || '<p>Notification from Smart Queue System</p>';
  }
}

module.exports = new NotificationService();