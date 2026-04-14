const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'wa_order_v2',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: process.env.DB_DIALECT || 'mysql',
        logging: false
    }
);

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ MySQL Connected via Sequelize');
        await sequelize.sync({ alter: true });
        console.log('✅ MySQL Models Synchronized');
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
    }
};

module.exports = { sequelize, connectDB };
