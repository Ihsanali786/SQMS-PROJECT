// src/services/excelService.js
import * as XLSX from 'xlsx';

class ExcelService {
  exportQueueToExcel(queueData, filename = 'queue-data') {
    // Format data for Excel
    const worksheetData = queueData.map(item => ({
      'Token ID': item.tokenId,
      'Customer Name': item.name,
      'Service': item.service,
      'Date': item.date,
      'Time': item.time,
      'Status': item.status,
      'Branch': item.branch
    }));
    
    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    
    // Auto-size columns
    const maxWidth = 20;
    worksheet['!cols'] = Object.keys(worksheetData[0] || {}).map(() => ({ wch: maxWidth }));
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Queue Data');
    
    // Export
    XLSX.writeFile(workbook, `${filename}-${Date.now()}.xlsx`);
  }

  exportAppointmentsToExcel(appointments, username) {
    const worksheetData = appointments.map(apt => ({
      'Token': apt.tokenId,
      'Service': apt.service,
      'Date': apt.date,
      'Time': apt.time,
      'Branch': apt.branch,
      'Status': apt.status || 'waiting',
      'Booked On': apt.timestamp
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${username}-Appointments`);
    
    XLSX.writeFile(workbook, `${username}-appointments-${Date.now()}.xlsx`);
  }

  exportStatisticsToExcel(stats, dateRange) {
    const data = [
      { Metric: 'Total Tokens', Value: stats.total },
      { Metric: 'Completed', Value: stats.completed },
      { Metric: 'Cancelled', Value: stats.cancelled },
      { Metric: 'Waiting', Value: stats.waiting },
      { Metric: 'Average Wait Time', Value: stats.avgWaitTime },
      { Metric: 'Peak Hour', Value: stats.peakHour },
      { Metric: 'Date Range', Value: dateRange }
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Statistics');
    
    XLSX.writeFile(workbook, `statistics-${Date.now()}.xlsx`);
  }
}

export default new ExcelService();