require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const Profile = require('./models/Profile');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB,
  });

  // Approve all admin users automatically
  const adminResult = await Profile.updateMany(
    { role: 'admin' },
    { $set: { accountStatus: 'approved' } }
  );
  console.log(`✅ Approved ${adminResult.modifiedCount} admin(s)`);

  // Auto-approve users that don't have accountStatus set yet (legacy users)
  const legacyResult = await Profile.updateMany(
    { accountStatus: { $exists: false } },
    { $set: { accountStatus: 'approved' } }
  );
  console.log(`✅ Auto-approved ${legacyResult.modifiedCount} legacy user(s)`);

  // Show current state
  const all = await Profile.find({}, 'email role accountStatus').lean();
  console.log('\n📋 Current users:');
  all.forEach(u => console.log(`  ${u.email} → role:${u.role}, status:${u.accountStatus}`));

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
