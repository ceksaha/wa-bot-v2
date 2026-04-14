const { sequelize } = require('../src/config/database');

async function check() {
    try {
        await sequelize.authenticate();
        const [results] = await sequelize.query('SHOW INDEX FROM Tenants');
        console.log(JSON.stringify(results, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}

check();
