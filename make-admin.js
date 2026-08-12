require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const Profile = require('./models/Profile');

async function run() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Usage: node make-admin.js <email>');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB,
  });

  const result = await Profile.updateOne(
    { email: email.toLowerCase() },
    { $set: { role: 'admin', kycStatus: 'approved', emailVerified: true } }
  );

  if (result.matchedCount === 0) {
    console.error('❌ No user found with email:', email);
  } else {
    console.log('✅ Promoted to admin:', email);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
