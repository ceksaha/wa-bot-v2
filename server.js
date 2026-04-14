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

app.use('/api/auth', authRoutes);
app.use('/api', protect, apiRoutes);

// Front-end routes
app.get('/', (req, res) => res.redirect('/dashboard'));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/dashboard', protect, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Health Check
app.get('/health', (req, res) => res.status(200).send('OK'));

// Start Server
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
    console.log(`🚀 V2 Multi-Tenant Dashboard: http://localhost:${PORT}/dashboard`);
    
    // Start WhatsApp Manager
    const { startWhatsApp } = require('./src/services/whatsapp');
    startWhatsApp().catch(err => console.error('❌ WhatsApp Manager Error:', err));
});

// Graceful Shutdown
const shutdown = async (signal) => {
    console.log(`SHUTDOWN: Received ${signal}. Closing connections...`);
    server.close(() => {
        console.log('- Server stopped.');
        process.exit(0);
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
