const express = require('express');
const router = express.Router();
const Tenant = require('../models/tenant');
const Admin = require('../models/admin');
const { protect } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Middleware to ensure user is a Super Admin
const superProtect = (req, res, next) => {
    if (req.admin && req.admin.role === 'super_admin') {
        next();
    } else {
        res.status(403).json({ success: false, error: 'Akses Ditolak: Hanya untuk Super Admin.' });
    }
};

// Apply protection to all routes here
router.use(protect, superProtect);

// Get All Tenants with their Admins
router.get('/tenants', async (req, res) => {
    try {
        const tenants = await Tenant.findAll({
            include: [{ model: Admin, attributes: ['username', 'role'] }]
        });
        res.json({ success: true, data: tenants });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Update Tenant Status/Expiry
router.post('/tenants/:id/update', async (req, res) => {
    try {
        const { is_active, expired_at } = req.body;
        const tenant = await Tenant.findByPk(req.params.id);
        if (!tenant) return res.status(404).json({ success: false, error: 'Tenant tidak ditemukan.' });

        if (is_active !== undefined) tenant.is_active = is_active;
        if (expired_at !== undefined) tenant.expired_at = expired_at;

        await tenant.save();
        res.json({ success: true, data: tenant });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Create New Tenant + Admin
router.post('/tenants/create', async (req, res) => {
    try {
        const { username, password, shop_name } = req.body;
        
        // Hash password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // 1. Create Admin
        const newAdmin = await Admin.create({
            username,
            password: hashedPassword,
            role: 'tenant'
        });

        // 2. Create Tenant
        const newTenant = await Tenant.create({
            admin_id: newAdmin.id,
            shop_name: shop_name || 'Toko Baru'
        });

        res.json({ success: true, data: { admin: newAdmin, tenant: newTenant } });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
