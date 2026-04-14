const { connectDB, sequelize } = require('./db');
const Admin = require('./models/admin');
const Tenant = require('./models/tenant');
const bcrypt = require('bcryptjs');

const seed = async () => {
    try {
        await connectDB();
        
        // Create Admin
        const admin = await Admin.create({
            username: 'admin',
            password: '$2b$12$JlmR1Ppv6Ot0SwFiAbrEmuu5LbqbOJChASx9KFMKkpwDDaDM6E.zO',
            role: 'superadmin'
        });
        console.log('✅ SuperAdmin Created');

        // Create Tenant for this Admin
        await Tenant.create({
            admin_id: admin.id,
            shop_name: 'Kuliner Mama Mia',
            shop_slogan: 'Pusatnya Kulineran V2',
            bot_number: '6287893275288'
        });
        console.log('✅ First Tenant Created');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding error:', error);
        process.exit(1);
    }
};

seed();
