const Admin = require('./models/admin');
const Tenant = require('./models/tenant');
const Order = require('./models/order');

async function diagnose() {
    try {
        const admins = await Admin.findAll();
        console.log('Admins Count:', admins.length);
        admins.forEach(a => console.log('  Admin:', a.id, a.username));

        const tenants = await Tenant.findAll();
        console.log('Tenants Count:', tenants.length);
        tenants.forEach(t => console.log('  Tenant:', t.id, t.shop_name, '-> AdminID:', t.admin_id));

        const orders = await Order.findAll({ order: [['id', 'DESC']], limit: 5 });
        console.log('Total Orders (last 5):', orders.length);
        orders.forEach(o => console.log('  Order:', o.id, 'TenantID:', o.tenant_id, 'Status:', o.status));

        process.exit(0);
    } catch (e) {
        console.error('ERROR:', e.message);
        process.exit(1);
    }
}

diagnose();
