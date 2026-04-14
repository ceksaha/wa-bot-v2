const Tenant = require('../src/models/tenant');
const Admin = require('../models/admin');
const { connectDB } = require('../src/config/database');

async function run() {
    await connectDB();
    const tenants = await Tenant.findAll({ include: Admin });
    console.log(JSON.stringify(tenants.map(t => ({
        id: t.id,
        shop_name: t.shop_name,
        admin_user: t.Admin ? t.Admin.username : 'NO_ADMIN'
    })), null, 2));
    process.exit(0);
}

run();
