const mongoose = require('mongoose');
require('./db');
const Setting = require('./models/setting');

async function run() {
    try {
        const s = await Setting.findOne({ key: 'bot_number' });
        console.log('BOT_NUMBER_V1:', s ? s.value : 'NONE');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
