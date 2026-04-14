require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./src/config/database');
const { protect } = require('./src/middleware/auth');

// Initialize DB
connectDB();

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// Initialize Socket.io
const { initSocket } = require('./src/services/socket');
initSocket(server);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static Files
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Routes
const authRoutes = require('./src/routes/auth');
const apiRoutes = require('./src/routes/api');
const superAdminRoutes = require('./src/routes/superAdmin');

app.use('/api/auth', authRoutes);
app.use('/api', protect, apiRoutes);
app.use('/api/super', superAdminRoutes);

// Front-end routes
app.get('/', (req, res) => res.redirect('/dashboard'));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/dashboard', protect, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});
app.get('/super-admin', protect, (req, res) => {
    if (req.admin.role !== 'super_admin') return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, 'public', 'super-admin.html'));
});

// Health Check
app.get('/health', (req, res) => res.status(200).send('OK'));

// Start Server
const PORT = process.env.PORT || 3002;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 V2 Multi-Tenant Dashboard: http://192.168.7.200:${PORT}/dashboard`);
    console.log(`📡 Local Access (if applicable): http://localhost:${PORT}/dashboard`);
    
    // Start WhatsApp Manager
    const { startWhatsApp } = require('./src/services/whatsapp');
    startWhatsApp().then(() => {
        // Start Tunnel after WA is ready
        startTunnel();
    }).catch(err => console.error('❌ WhatsApp Manager Error:', err));
});

// Graceful Shutdown
const shutdown = async (signal) => {
    console.log(`SHUTDOWN: Received ${signal}. Closing connections...`);
    server.close(() => {
        console.log('- Server stopped.');
        process.exit(0);
    });
};

// Start Cloudflare Quick Tunnel
const startTunnel = () => {
    const { spawn } = require('child_process');
    const { sendWhatsAppMessage } = require('./src/services/whatsapp');
    const Tenant = require('./src/models/tenant');

    console.log('🌐 Starting Cloudflare Quick Tunnel...');
    const cf = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`]);

    cf.stderr.on('data', async (data) => {
        const output = data.toString();
        const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        
        if (match) {
            const tunnelUrl = match[0];
            console.log(`✨ New Public Link: ${tunnelUrl}`);

            try {
                const tenants = await Tenant.findAll();
                for (const tenant of tenants) {
                    if (tenant.tunnel_url !== tunnelUrl) {
                        tenant.tunnel_url = tunnelUrl;
                        await tenant.save();

                        // Notify via WA if bot number exists
                        if (tenant.bot_number) {
                            const msg = `🚀 *DASHBOARD ONLINE*\n\nAlamat baru Anda:\n${tunnelUrl}/dashboard\n\nLink ini bisa diakses dari luar jaringan.`;
                            sendWhatsAppMessage(tenant.id, tenant.bot_number, msg);
                        }
                    }
                }
            } catch (err) {
                console.error('❌ Error updating tunnel URL:', err.message);
            }
        }
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
