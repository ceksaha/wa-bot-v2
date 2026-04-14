require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { connectDB } = require('./db');
const cookieParser = require('cookie-parser');
const { protect } = require('./middleware/auth');

// Initialize DB (MySQL)
connectDB();

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// Initialize Socket.io
const { initSocket } = require('./services/socket');
initSocket(server);

// Middleware
app.use(express.json());
app.use(cookieParser());

// Static Files
app.use(express.static('public', { index: false }));

// Routes
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

app.use('/api/auth', authRoutes);
app.use('/api', protect, apiRoutes);

// Front-end routes
app.get('/', (req, res) => res.redirect('/dashboard'));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/dashboard', protect, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Health Check
app.get('/health', (req, res) => res.status(200).send('OK'));

// Start Server
const PORT = 3002;
server.listen(PORT, () => {
    console.log('🚀 V2 Multi-Tenant Dashboard: http://localhost:' + PORT + '/dashboard');
    
    // Start WhatsApp Manager V2
    const { startWhatsApp } = require('./services/whatsapp');
    startWhatsApp().catch(err => console.error('❌ WhatsApp Manager Error:', err));
});

// Graceful Shutdown
const shutdown = async (signal) => {
    console.log('SHUTDOWN: Received ' + signal + '. Closing connections...');
    server.close(() => {
        console.log('- Server stopped.');
        process.exit(0);
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
