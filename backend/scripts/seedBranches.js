// backend/scripts/seedBranches.js
const mongoose = require('mongoose');
const Branch = require('../models/Branch');
require('dotenv').config();

const branches = [
  // Bank Branches
  {
    branchId: 'HBL-KHI-001',
    name: 'HBL Main Branch',
    serviceType: 'bank',
    city: 'Karachi',
    address: 'I.I. Chundrigar Road, Karachi',
    phone: '021-111-111-111',
    email: 'karachi.main@hbl.com',
    managerName: 'Ahmed Raza',
    tokenPrefix: 'B',
    currentCounter: 0
  },
  {
    branchId: 'HBL-LHR-001',
    name: 'HBL Liberty Market',
    serviceType: 'bank',
    city: 'Lahore',
    address: 'Liberty Market, Lahore',
    phone: '042-111-111-111',
    email: 'lahore.liberty@hbl.com',
    managerName: 'Sana Mir',
    tokenPrefix: 'B',
    currentCounter: 0
  },
  {
    branchId: 'UBL-KHI-001',
    name: 'UBL Clifton Branch',
    serviceType: 'bank',
    city: 'Karachi',
    address: 'Clifton Block 5, Karachi',
    phone: '021-222-222-222',
    email: 'clifton@ubl.com',
    managerName: 'Omar Riaz',
    tokenPrefix: 'B',
    currentCounter: 0
  },
  
  // NADRA Offices
  {
    branchId: 'NADRA-KHI-001',
    name: 'NADRA Mega Center Karachi',
    serviceType: 'nadra',
    city: 'Karachi',
    address: 'Shahrah-e-Faisal, Karachi',
    phone: '021-333-333-333',
    email: 'karachi@nadra.gov.pk',
    managerName: 'Ali Hassan',
    tokenPrefix: 'N',
    currentCounter: 0
  },
  {
    branchId: 'NADRA-LHR-001',
    name: 'NADRA Regional Office Lahore',
    serviceType: 'nadra',
    city: 'Lahore',
    address: 'Mall Road, Lahore',
    phone: '042-333-333-333',
    email: 'lahore@nadra.gov.pk',
    managerName: 'Fatima Zafar',
    tokenPrefix: 'N',
    currentCounter: 0
  },
  
  // University Campuses
  {
    branchId: 'NUST-ISB-001',
    name: 'NUST H-12 Campus',
    serviceType: 'university',
    city: 'Islamabad',
    address: 'H-12 Sector, Islamabad',
    phone: '051-444-444-444',
    email: 'admissions@nust.edu.pk',
    managerName: 'Dr. Khalid Mahmood',
    tokenPrefix: 'U',
    currentCounter: 0
  },
  {
    branchId: 'LUMS-LHR-001',
    name: 'LUMS Main Campus',
    serviceType: 'university',
    city: 'Lahore',
    address: 'DHA Phase 5, Lahore',
    phone: '042-555-555-555',
    email: 'registrar@lums.edu.pk',
    managerName: 'Dr. Saba Aslam',
    tokenPrefix: 'U',
    currentCounter: 0
  },
  
  // Hospitals
  {
    branchId: 'AKUH-KHI-001',
    name: 'Aga Khan University Hospital',
    serviceType: 'hospital',
    city: 'Karachi',
    address: 'Stadium Road, Karachi',
    phone: '021-666-666-666',
    email: 'appointments@aku.edu',
    managerName: 'Dr. Shamshad',
    tokenPrefix: 'H',
    currentCounter: 0
  },
  {
    branchId: 'PIC-LHR-001',
    name: 'Punjab Institute of Cardiology',
    serviceType: 'hospital',
    city: 'Lahore',
    address: 'Ferozepur Road, Lahore',
    phone: '042-777-777-777',
    email: 'info@pic.edu.pk',
    managerName: 'Dr. Aslam',
    tokenPrefix: 'H',
    currentCounter: 0
  }
];

async function seedBranches() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await Branch.deleteMany({});
    await Branch.insertMany(branches);
    console.log('✅ Branches seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding branches:', error);
    process.exit(1);
  }
}

seedBranches();