const { sequelize } = require('./src/config/database');

async function fix() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB...');
        await sequelize.query('ALTER TABLE Tenants ADD COLUMN tunnel_url VARCHAR(255) DEFAULT NULL').catch(err => {
            if (err.message.includes('duplicate column')) {
                console.log('Column already exists.');
            } else {
                throw err;
            }
        });
        console.log('Successfully added tunnel_url column!');
        process.exit(0);
    } catch (e) {
        console.error('Failed to fix DB:', e.message);
        process.exit(1);
    }
}

fix();
