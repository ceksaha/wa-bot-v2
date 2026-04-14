const Admin = require('../src/models/admin');
const Tenant = require('../src/models/tenant');
const { connectDB } = require('../src/config/database');

async function showData() {
    await connectDB();
    try {
        const admins = await Admin.findAll();
        console.log("=== ADMINS ===");
        admins.forEach(a => console.log(`ID: ${a.id}, Username: ${a.username}, Role: ${a.role}`));

        const tenants = await Tenant.findAll({ include: Admin });
        console.log("\n=== TENANTS ===");
        tenants.forEach(t => console.log(`ID: ${t.id}, Shop: ${t.shop_name}, AdminID: ${t.admin_id}, AdminUser: ${t.Admin?.username}`));
        
        process.exit(0);
    } catch (e) {
        console.error("Error:", e.message);
        process.exit(1);
    }
}
showData();
