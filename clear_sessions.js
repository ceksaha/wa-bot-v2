const { sequelize } = require('./db');
const UserSession = require('./models/userSession');

async function clearSessions() {
    try {
        await sequelize.authenticate();
        await UserSession.destroy({ where: {}, truncate: true });
        console.log('✅ ALL SESSIONS CLEARED');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

clearSessions();
