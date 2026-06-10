const User = require('../models/User');

const seedAdminUser = async () => {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin1234';
  const adminName = process.env.ADMIN_NAME || 'Admin';

  const existing = await User.findOne({ email: adminEmail });
  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
      console.log(`✅ Updated role to admin for ${adminEmail}`);
    }
    return;
  }

  await User.create({
    name: adminName,
    email: adminEmail,
    password: adminPassword,
    role: 'admin',
  });

  console.log(`✅ Seeded admin user: ${adminEmail} (password: ${adminPassword})`);
};

module.exports = seedAdminUser;

