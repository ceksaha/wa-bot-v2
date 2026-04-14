const Admin = require('../src/models/admin');
const { connectDB } = require('../src/config/database');

async function run() {
    await connectDB();
    const username = 'arkhan';
    const deleted = await Admin.destroy({ where: { username } });
    if (deleted) {
        console.log(`✅ User ${username} deleted.`);
    } else {
        console.log(`User ${username} not found.`);
    }
    process.exit(0);
}

run();
