// backend/config/dbIndexes.js
const Branch = require('../models/Branch');
const BranchToken = require('../models/BranchToken');
const User = require('../models/User');

async function createIndexes() {
  try {
    console.log('📊 Creating database indexes...');
    
    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ role: 1 });
    console.log('  ✓ User indexes created');
    
    // Branch indexes
    await Branch.collection.createIndex({ branchId: 1 }, { unique: true });
    await Branch.collection.createIndex({ serviceType: 1, city: 1 });
    await Branch.collection.createIndex({ isActive: 1 });
    console.log('  ✓ Branch indexes created');
    
    // Token indexes
    await BranchToken.collection.createIndex({ branchId: 1, status: 1, position: 1 });
    await BranchToken.collection.createIndex({ tokenNumber: 1 });
    await BranchToken.collection.createIndex({ customerId: 1 });
    await BranchToken.collection.createIndex({ date: 1, status: 1 });
    console.log('  ✓ Token indexes created');
    
    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
    // Don't exit, just log the error
  }
}

module.exports = createIndexes;