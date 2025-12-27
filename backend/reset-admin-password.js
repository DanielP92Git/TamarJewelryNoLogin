const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL);

const Users = mongoose.model('Users', {
  name: { type: String },
  email: {
    type: String,
    required: true,
    unique: true,
    match:
      /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/,
  },
  password: { type: String, required: true },
  cartData: { type: Object },
  Date: { type: Date, default: Date.now },
  userType: { type: String, default: 'user' },
});

async function listAdminUsers() {
  try {
    const admins = await Users.find({ userType: 'admin' });
    if (admins.length === 0) {
      console.log('❌ No admin users found in database');
      return [];
    }
    console.log('\n📋 Admin users found:');
    admins.forEach((admin, index) => {
      console.log(`  ${index + 1}. Email: ${admin.email} | Name: ${admin.name || 'N/A'}`);
    });
    return admins;
  } catch (error) {
    console.error('Error listing admin users:', error);
    return [];
  }
}

async function resetPassword(adminEmail, newPassword) {
  try {
    if (!adminEmail || !newPassword) {
      console.log('❌ Error: Both email and password are required');
      console.log('Usage: node reset-admin-password.js <email> <new-password>');
      return;
    }

    // Check if user exists and is admin
    const user = await Users.findOne({ email: adminEmail, userType: 'admin' });
    if (!user) {
      console.log(`❌ No admin user found with email: ${adminEmail}`);
      console.log('\nAvailable admin users:');
      await listAdminUsers();
      return;
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the user
    const result = await Users.updateOne(
      { email: adminEmail, userType: 'admin' },
      { $set: { password: hashedPassword } }
    );

    if (result.matchedCount === 0) {
      console.log('❌ No admin user found with that email');
    } else if (result.modifiedCount === 0) {
      console.log('⚠️ User found but password was not updated (may be the same)');
    } else {
      console.log('\n✅ Password reset successfully!');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   New password: ${newPassword}`);
      console.log('\n⚠️  You can now log in with these credentials.');
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // No arguments - list admin users
    console.log('🔍 Listing admin users...\n');
    const admins = await listAdminUsers();
    if (admins.length > 0) {
      console.log('\n💡 To reset a password, run:');
      console.log('   node reset-admin-password.js <email> <new-password>');
      console.log('\nExample:');
      console.log('   node reset-admin-password.js admin@example.com MyNewPassword123');
    }
    mongoose.connection.close();
  } else if (args.length === 2) {
    // Email and password provided
    const [email, password] = args;
    await resetPassword(email, password);
  } else {
    console.log('❌ Invalid arguments');
    console.log('Usage: node reset-admin-password.js [email] [new-password]');
    console.log('\nExamples:');
    console.log('  node reset-admin-password.js                    # List all admin users');
    console.log('  node reset-admin-password.js admin@example.com MyNewPass123');
    mongoose.connection.close();
  }
}

main();


