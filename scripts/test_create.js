const bcrypt = require('bcryptjs');
const Admin = require('./src/models/admin');
const Tenant = require('./src/models/tenant');
const { connectDB } = require('./src/config/database');

async function test() {
    await connectDB();
    try {
        const username = 'test_' + Math.floor(Math.random() * 1000);
        console.log(`Trying to create user: ${username}`);
        
        const h = await bcrypt.hash('123456', 10);
        const adm = await Admin.create({
            username,
            password: h,
            role: 'tenant'
        });
        console.log(`Admin created: id=${adm.id}`);

        const tnt = await Tenant.create({
            admin_id: adm.id,
            shop_name: 'Debug Shop'
        });
        console.log(`✅ Tenant created: id=${tnt.id}`);
        process.exit(0);
    } catch (e) {
        console.error(`❌ FAILED: ${e.message}`);
        console.error(e);
        process.exit(1);
    }
}

test();
