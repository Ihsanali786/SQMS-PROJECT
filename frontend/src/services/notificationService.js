// src/services/notificationService.js
import toast from 'react-hot-toast';

class NotificationService {
  constructor() {
    this.emailEnabled = true;
    this.smsEnabled = false; // Would require backend integration
  }

  async sendEmail(to, subject, body) {
    if (!this.emailEnabled) return;
    
    // Mock email - In production, this would call your backend API
    console.log(`Sending email to ${to}:`, { subject, body });
    
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        toast.success(`📧 Email notification sent to ${to}`);
        resolve(true);
      }, 500);
    });
  }

  async sendSMS(phoneNumber, message) {
    if (!this.smsEnabled) return;
    
    console.log(`Sending SMS to ${phoneNumber}:`, message);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        toast.success(`📱 SMS sent to ${phoneNumber}`);
        resolve(true);
      }, 500);
    });
  }

  async sendTokenGenerated(user, tokenData) {
    const subject = 'Your Token Has Been Generated';
    const body = `
      Dear ${user.name},
      
      Your token ${tokenData.tokenId} has been generated successfully.
      
      Service: ${tokenData.service}
      Branch: ${tokenData.branch}
      Date: ${tokenData.date}
      Time: ${tokenData.time}
      
      You can track your queue status in real-time using our app.
      
      Thank you for using Smart Queue System!
    `;
    
    await this.sendEmail(user.email, subject, body);
  }

  async sendTurnAlert(user, tokenData) {
    const subject = 'Your Turn is Almost Here!';
    const body = `
      Dear ${user.name},
      
      Your turn for ${tokenData.service} is coming up soon!
      Please proceed to the service counter.
      
      Token: ${tokenData.tokenId}
      Current Status: ${tokenData.peopleAhead} people ahead
      
      Don't miss your turn!
    `;
    
    await this.sendEmail(user.email, subject, body);
  }

  async sendAppointmentReminder(user, appointment) {
    const subject = 'Appointment Reminder';
    const body = `
      Dear ${user.name},
      
      This is a reminder for your appointment tomorrow.
      
      Service: ${appointment.service}
      Date: ${appointment.date}
      Time: ${appointment.time}
      Token: ${appointment.tokenId}
      
      Please arrive 10 minutes before your scheduled time.
    `;
    
    await this.sendEmail(user.email, subject, body);
  }
}

export default new NotificationService();