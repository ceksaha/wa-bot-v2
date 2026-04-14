const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('wa_order_v2', 'root', '', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false
});

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ MySQL Connected via Sequelize');
        await sequelize.sync({ alter: true });
        console.log('✅ MySQL Models Synchronized');
    } catch (error) {
        console.error('❌ Database connection error:', error);
    }
};

module.exports = { sequelize, connectDB };
