const Admin = require('../src/models/admin');
const { connectDB } = require('../src/config/database');

async function run() {
    await connectDB();
    const username = 'arkhan';
    const a = await Admin.findOne({ where: { username } });
    if (a) {
        console.log(`FOUND: id=${a.id}, username=${a.username}`);
    } else {
        console.log('NOT_FOUND');
    }
    process.exit(0);
}

run();
