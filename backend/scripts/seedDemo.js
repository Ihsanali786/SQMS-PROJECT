// backend/scripts/seedDemo.js
// Safe demo seed script for the SQMS hackathon demonstration.
// Creates one demo regular user and waiting demo tokens without deleting data.
// Demo user: demo@example.com / demo1234
// Run from backend/: node scripts/seedDemo.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Token = require('../models/Token');
const Queue = require('../models/Queue');

const DEMO_USER_EMAIL = 'demo@example.com';
const DEMO_USER_PASSWORD = 'demo1234';
const DEFAULT_SERVICE_MIN = 5;

const demoTokens = [
  { service: 'Account Opening', serviceType: 'bank', branch: 'HBL Main Branch', customerName: 'Ali Hassan', prefix: 'B' },
  { service: 'Cash Deposit', serviceType: 'bank', branch: 'HBL Main Branch', customerName: 'Sara Ahmed', prefix: 'B' },
  { service: 'Loan Application', serviceType: 'bank', branch: 'UBL Clifton', customerName: 'Kamran Shah', prefix: 'B' },
  { service: 'Card Issue', serviceType: 'bank', branch: 'MCB Tower Branch', customerName: 'Fatima Malik', prefix: 'B' },
  { service: 'CNIC Renewal', serviceType: 'nadra', branch: 'NADRA Mega Center', customerName: 'Usman Tariq', prefix: 'N' },
  { service: 'New CNIC', serviceType: 'nadra', branch: 'NADRA Gulberg Office', customerName: 'Hina Baig', prefix: 'N' },
  { service: 'Admission', serviceType: 'university', branch: 'NUST Islamabad', customerName: 'Bilal Chaudhry', prefix: 'U' },
  { service: 'Transcript', serviceType: 'university', branch: 'Punjab University', customerName: 'Ayesha Khan', prefix: 'U' },
  { service: 'General Checkup', serviceType: 'hospital', branch: 'Shifa International', customerName: 'Tariq Mehmood', prefix: 'H' },
  { service: 'Lab Test', serviceType: 'hospital', branch: 'Mayo Hospital', customerName: 'Rabia Noor', prefix: 'H' }
];

async function getNextDemoTokenNumber(serviceType, prefix) {
  const count = await Token.countDocuments({ serviceType });
  return `${prefix}-SIM-${String(count + 1).padStart(3, '0')}`;
}

async function seed() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing. Add it to backend/.env before seeding.');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    let demoUser = await User.findOne({ email: DEMO_USER_EMAIL });
    if (!demoUser) {
      demoUser = await User.create({
        name: 'Demo Customer',
        email: DEMO_USER_EMAIL,
        password: DEMO_USER_PASSWORD,
        role: 'user'
      });
      console.log(`Created demo user: ${DEMO_USER_EMAIL} / ${DEMO_USER_PASSWORD}`);
    } else {
      console.log(`Demo user already exists: ${DEMO_USER_EMAIL}`);
    }

    const existingDemoTokens = await Token.countDocuments({ tokenNumber: /^[BNUH]-SIM-/ });
    if (existingDemoTokens > 0) {
      console.log(`${existingDemoTokens} demo tokens already exist. Skipping token creation.`);
      console.log('Existing non-demo data was left untouched.');
    } else {
      const byType = demoTokens.reduce((groups, token) => {
        groups[token.serviceType] = groups[token.serviceType] || [];
        groups[token.serviceType].push(token);
        return groups;
      }, {});

      for (const [serviceType, group] of Object.entries(byType)) {
        const openCounters = 2;
        const startingPosition = await Token.countDocuments({ serviceType, status: 'waiting' });

        for (let i = 0; i < group.length; i += 1) {
          const demo = group[i];
          const tokenNumber = await getNextDemoTokenNumber(serviceType, demo.prefix);
          const customersAhead = startingPosition + i;
          const estimatedWaitTime = Math.ceil(customersAhead / openCounters) * DEFAULT_SERVICE_MIN;

          await Token.create({
            tokenNumber,
            service: demo.service,
            serviceType,
            branch: demo.branch,
            customerName: demo.customerName,
            customerId: demoUser._id,
            date: new Date(),
            time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }),
            position: customersAhead + 1,
            estimatedWaitTime,
            status: 'waiting',
            isSimulated: true
          });

          console.log(`Created token ${tokenNumber} - ${demo.customerName} (${demo.service})`);
        }

        const waitingCount = await Token.countDocuments({ serviceType, status: 'waiting' });
        await Queue.findOneAndUpdate(
          { serviceType },
          {
            openCounters,
            waitingCount,
            lastUpdated: new Date()
          },
          { upsert: true }
        );

        console.log(`Queue ${serviceType}: ${waitingCount} waiting, ${openCounters} counters open`);
      }

      console.log('Demo data seeded successfully.');
    }

    console.log('\nDemo accounts:');
    console.log('Admin: admin@example.com / admin1234');
    console.log(`User:  ${DEMO_USER_EMAIL} / ${DEMO_USER_PASSWORD}`);
    process.exitCode = 0;
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

seed();
