const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../models/admin');

// Login Admin (Tenant)
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const admin = await Admin.findOne({ where: { username } });
        
        if (!admin) {
            return res.status(401).json({ success: false, message: 'Username atau password salah' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Username atau password salah' });
        }

        const token = jwt.sign(
            { id: admin.id, username: admin.username, role: admin.role },
            process.env.JWT_SECRET || 'secret_key_123',
            { expiresIn: '1d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        res.json({ success: true, message: 'Login berhasil' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Logout
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logout berhasil' });
});

// Check Auth Status
router.get('/me', (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ success: false });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123');
        res.json({ success: true, admin: decoded });
    } catch (e) {
        res.status(401).json({ success: false });
    }
});

module.exports = router;
