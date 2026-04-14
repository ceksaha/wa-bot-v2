const Admin = require('../src/models/admin');
const Tenant = require('../src/models/tenant');
const { connectDB } = require('../src/config/database');

async function cleanup() {
    await connectDB();
    try {
        const username = 'arkhan';
        const a = await Admin.findOne({ where: { username } });
        if (a) {
            await Tenant.destroy({ where: { admin_id: a.id } }); // Delete child first
            await Admin.destroy({ where: { id: a.id } }); // Then delete parent
            console.log(`✅ Cleaned up user ${username} and their shop.`);
        }
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
cleanup();
