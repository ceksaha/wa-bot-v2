const Admin = require('./src/models/admin');
const { connectDB } = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function makeSuper(username, password) {
    await connectDB();
    
    let admin = await Admin.findOne({ where: { username } });
    
    if (admin) {
        admin.role = 'super_admin';
        if (password) admin.password = await bcrypt.hash(password, 10);
        await admin.save();
        console.log(`✅ User ${username} promoted to Super Admin (with hashed password)!`);
    } else {
        if (!password) {
            console.error('Password is required for a new user.');
            process.exit(1);
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        admin = await Admin.create({
            username,
            password: hashedPassword,
            role: 'super_admin'
        });
        console.log(`✅ New Super Admin ${username} created (with hashed password)!`);
    }
    process.exit(0);
}

const args = process.argv.slice(2);
if (args.length < 1) {
    console.log('Usage: node make_super_admin.js <username> [password]');
    process.exit(1);
}

makeSuper(args[0], args[1]);
