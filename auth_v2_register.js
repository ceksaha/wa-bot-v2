const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../models/admin');
const Tenant = require('../models/tenant');
const { startSession } = require('../services/whatsapp');

// Register New UMKM (Tenant)
router.post('/register', async (req, res) => {
    const { username, password, shop_name, bot_number } = req.body;
    
    try {
        // 1. Check if user exists
        const existing = await Admin.findOne({ where: { username } });
        if (existing) return res.status(400).json({ success: false, message: 'Username sudah digunakan' });

        // 2. Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Create Admin
        const newAdmin = await Admin.create({
            username,
            password: hashedPassword,
            role: 'tenant'
        });

        // 4. Create Tenant
        const newTenant = await Tenant.create({
            admin_id: newAdmin.id,
            shop_name: shop_name || 'Toko Baru',
            bot_number: bot_number || ''
        });

        // 5. Instantly start WhatsApp Session for this new tenant
        // (This allows them to get pairing code immediately)
        startSession(newTenant).catch(err => console.error('Error starting new tenant session:', err));

        res.status(201).json({ 
            success: true, 
            message: 'Registrasi Berhasil! Silakan Login.',
            tenantId: newTenant.id 
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Login Admin (Tenant)
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const admin = await Admin.findOne({ where: { username } });
        if (!admin) return res.status(401).json({ success: false, message: 'Username atau password salah' });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Username atau password salah' });

        const tenant = await Tenant.findOne({ where: { admin_id: admin.id } });

        const token = jwt.sign(
            { id: admin.id, username: admin.username, role: admin.role, tenantId: tenant ? tenant.id : null },
            process.env.JWT_SECRET || 'secret_key_123',
            { expiresIn: '1d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({ success: true, message: 'Login berhasil' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Check Auth Status
router.get('/me', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ success: false });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123');
        res.json({ success: true, admin: decoded });
    } catch (e) {
        res.status(401).json({ success: false });
    }
});

// Logout
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logout berhasil' });
});

module.exports = router;
