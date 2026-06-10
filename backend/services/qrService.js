// backend/services/qrService.js
const crypto = require('crypto');

class QRService {
  
  // Generate encrypted QR data
  generateQRData(token, branch) {
    const payload = {
      tokenNumber: token.tokenNumber,
      branchId: branch.branchId,
      service: token.service,
      timestamp: token.createdAt,
      expiresAt: token.expiresAt,
      customerName: token.customerName,
      checkInCode: this.generateCheckInCode(token.tokenNumber)
    };
    
    // Encrypt the payload
    const encrypted = this.encryptData(JSON.stringify(payload));
    
    return {
      data: encrypted,
      checkInCode: payload.checkInCode,
      expiresAt: payload.expiresAt
    };
  }
  
  // Generate 6-digit check-in code
  generateCheckInCode(tokenNumber) {
    const hash = crypto.createHash('md5').update(tokenNumber + Date.now()).digest('hex');
    return hash.substring(0, 6).toUpperCase();
  }
  
  // Encrypt data
  encryptData(data) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.QR_ENCRYPTION_KEY || 'qr_secret_key', 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  }
  
  // Decrypt QR data (for scanning at counter)
  decryptQRData(encryptedData) {
    try {
      const [ivHex, encrypted] = encryptedData.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(process.env.QR_ENCRYPTION_KEY || 'qr_secret_key', 'salt', 32);
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('QR decryption error:', error);
      return null;
    }
  }
  
  // Verify check-in
  async verifyCheckIn(tokenNumber, checkInCode) {
    const BranchToken = require('../models/BranchToken');
    const token = await BranchToken.findOne({ tokenNumber });
    
    if (!token) {
      return { success: false, message: 'Invalid token' };
    }
    
    if (token.status !== 'waiting') {
      return { success: false, message: `Token already ${token.status}` };
    }
    
    // In production, store check-in codes in database
    // For demo, we'll accept any valid code
    
    return {
      success: true,
      token,
      message: 'Check-in successful! Please proceed to counter.'
    };
  }
}

module.exports = new QRService();