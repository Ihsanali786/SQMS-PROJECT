// src/services/pdfService.js
import jsPDF from 'jspdf';
import 'jspdf-autotable';

class PDFService {
  generateQueueReport(queueData, date) {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text('Smart Queue System Report', 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Date: ${date}`, 14, 35);
    doc.text(`Total Tokens: ${queueData.total}`, 14, 45);
    doc.text(`Completed: ${queueData.completed}`, 14, 55);
    doc.text(`Waiting: ${queueData.waiting}`, 14, 65);
    
    // Table
    const tableData = queueData.tokens.map(token => [
      token.tokenId,
      token.service,
      token.name,
      token.time,
      token.status
    ]);
    
    doc.autoTable({
      startY: 80,
      head: [['Token', 'Service', 'Customer', 'Time', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    doc.save(`queue-report-${date}.pdf`);
  }

  generateAppointmentReport(userAppointments, userName) {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('My Appointments Report', 14, 20);
    doc.setFontSize(12);
    doc.text(`Customer: ${userName}`, 14, 35);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 45);
    
    const tableData = userAppointments.map(apt => [
      apt.tokenId,
      apt.service,
      apt.date,
      apt.time,
      apt.branch,
      apt.status || 'waiting'
    ]);
    
    doc.autoTable({
      startY: 60,
      head: [['Token', 'Service', 'Date', 'Time', 'Branch', 'Status']],
      body: tableData,
      theme: 'striped'
    });
    
    doc.save(`my-appointments-${Date.now()}.pdf`);
  }

  generateTokenPDF(tokenData) {
    const doc = new jsPDF();
    
    // Add logo/border
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 277);
    
    doc.setFontSize(24);
    doc.setTextColor(41, 128, 185);
    doc.text('QUEUE TOKEN', 70, 40);
    
    doc.setFontSize(48);
    doc.setTextColor(0, 0, 0);
    doc.text(tokenData.tokenId, 70, 80);
    
    doc.setFontSize(12);
    doc.text(`Service: ${tokenData.service}`, 20, 120);
    doc.text(`Branch: ${tokenData.branch}`, 20, 135);
    doc.text(`Date: ${tokenData.date}`, 20, 150);
    doc.text(`Time: ${tokenData.time}`, 20, 165);
    
    // Add QR code placeholder
    doc.setDrawColor(0);
    doc.rect(140, 110, 50, 50);
    doc.setFontSize(10);
    doc.text('QR Code', 155, 135);
    
    doc.save(`token-${tokenData.tokenId}.pdf`);
  }
}

export default new PDFService();