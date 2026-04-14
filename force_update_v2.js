const bcrypt = require('bcryptjs');
const Admin = require('./src/models/admin');
const { connectDB } = require('./src/config/database');

async function fix() {
    await connectDB();
    const h = await bcrypt.hash('adm5wira', 10);
    const [updated] = await Admin.update(
        { password: h, role: 'super_admin' },
        { where: { username: 'saas_master' } }
    );
    if (updated) {
        console.log('✅ saas_master UPDATED AND ENCRYPTED');
    } else {
        console.log('❌ User not found, creating new...');
        await Admin.create({ username: 'saas_master', password: h, role: 'super_admin' });
    }
    process.exit(0);
}

fix();
