const Tenant = require('../src/models/tenant');
const { connectDB } = require('../src/config/database');

async function run() {
    await connectDB();
    const tenants = await Tenant.findAll();
    console.log(JSON.stringify(tenants.map(t => ({
        id: t.id,
        exp: t.expired_at
    })), null, 2));
    process.exit(0);
}
run();
