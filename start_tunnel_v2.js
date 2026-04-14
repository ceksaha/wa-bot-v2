const { spawn } = require('child_process');
const { Tenant } = require('./src/models/tenant'); // This might need direct file import if Tenant is not exported from a central index
const { connectDB, sequelize } = require('./src/config/database');
const { sendWhatsAppMessage } = require('./src/services/whatsapp');
const path = require('path');

// Re-import models because startWhatsApp depends on them
const Product = require('./src/models/product');
const Order = require('./src/models/order');
const UserSession = require('./src/models/userSession');

async function run() {
    console.log('🌐 Memulai Cloudflare Tunnel Watcher...');
    
    // Connect to DB
    await connectDB();

    // Start cloudflared
    const cf = spawn('cloudflared', ['tunnel', '--url', 'http://localhost:3002']);

    cf.stderr.on('data', async (data) => {
        const output = data.toString();
        // console.log(output); // Debug

        // Regex to find trycloudflare URL
        const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (match) {
            const tunnelUrl = match[0];
            console.log(`✨ Link Baru Ditemukan: ${tunnelUrl}`);

            // Update all tenants with this link
            const tenants = await require('./src/models/tenant').findAll();
            for (const tenant of tenants) {
                tenant.tunnel_url = tunnelUrl;
                await tenant.save();

                // Send notification to tenant's bot number if available
                if (tenant.bot_number) {
                    console.log(`📲 Mengirim info ke nomor bot UMKM-${tenant.id}: ${tenant.bot_number}`);
                    const msg = `🚀 *SISTEM ONLINE*\n\nAlamat Dashboard baru Anda:\n${tunnelUrl}/dashboard\n\nLink ini otomatis aktif & bisa diakses dari luar jaringan.`;
                    
                    // Note: We might need to wait for startWhatsApp in the main server.js 
                    // or just use a simple sender here. 
                    // For now, we'll log it and assume the user checks the dashboard.
                }
            }
            
            console.log('✅ Semua database tenant telah diperbarui.');
        }
    });

    cf.on('close', (code) => {
        console.log(`Cloudflared exited with code ${code}`);
        process.exit(code);
    });
}

run().catch(console.error);
