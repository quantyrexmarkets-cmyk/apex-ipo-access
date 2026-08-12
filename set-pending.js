require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const Profile = require('./models/Profile');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB });
  
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node set-pending.js <email>');
    process.exit(1);
  }
  
  const r = await Profile.updateOne(
    { email: email.toLowerCase() },
    { $set: { accountStatus: 'pending' } }
  );
  console.log(`✅ Updated ${r.modifiedCount} user to pending: ${email}`);
  
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => { console.error(err.message); process.exit(1); });
