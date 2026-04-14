const express = require('express');
const router = express.Router();
const {{ Op }} = require('sequelize');
const Order = require('../models/order');
const Product = require('../models/product');
const Tenant = require('../models/tenant');
const path = require('path');

// Helper to get Tenant for the logged-in admin
const getTenant = async (adminId) => {
    return await Tenant.findOne({ where: { admin_id: adminId } });
};

// Get all orders for the current tenant
router.get('/orders', async (req, res) => {
    try {
        const tenant = await getTenant(req.admin.id);
        if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

        const orders = await Order.findAll({ 
            where: { tenant_id: tenant.id },
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Products API
router.get('/products', async (req, res) => {
    try {
        const tenant = await getTenant(req.admin.id);
        const products = await Product.findAll({ 
            where: { tenant_id: tenant.id },
            order: [['name', 'ASC']]
        });
        res.json({ success: true, data: products });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/products', async (req, res) => {
    try {
        const tenant = await getTenant(req.admin.id);
        const productData = { ...req.body, tenant_id: tenant.id };
        const product = await Product.create(productData);
        res.status(201).json({ success: true, data: product });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

router.put('/products/:id', async (req, res) => {
    try {
        const tenant = await getTenant(req.admin.id);
        const product = await Product.findOne({ where: { id: req.params.id, tenant_id: tenant.id } });
        if (!product) return res.status(404).json({ success: false, message: 'Product Not Found' });
        
        await product.update(req.body);
        res.json({ success: true, data: product });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

router.delete('/products/:id', async (req, res) => {
    try {
        const tenant = await getTenant(req.admin.id);
        const product = await Product.findOne({ where: { id: req.params.id, tenant_id: tenant.id } });
        if (!product) return res.status(404).json({ success: false, message: 'Product Not Found' });
        
        await product.destroy();
        res.json({ success: true, message: 'Product deleted' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Store Settings (Tenant Profile)
router.get('/settings', async (req, res) => {
    try {
        const tenant = await getTenant(req.admin.id);
        // Map to old frontend format
        const settingsObj = {
            shop_name: tenant.shop_name,
            shop_slogan: tenant.shop_slogan,
            bot_number: tenant.bot_number
        };
        res.json({ success: true, data: settingsObj });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.patch('/settings/:key', async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    try {
        const tenant = await getTenant(req.admin.id);
        if (key === 'shop_name') tenant.shop_name = value;
        if (key === 'shop_slogan') tenant.shop_slogan = value;
        if (key === 'bot_number') tenant.bot_number = value;
        
        await tenant.save();
        res.json({ success: true, data: tenant });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Reports & Export (Minimal placeholder logic for now)
router.get('/reports/sales', async (req, res) => {
    res.json({ success: true, data: [] });
});

router.get('/export/orders', async (req, res) => {
    res.status(501).json({ success: false, message: 'Export not yet migrated to SQL' });
});

// WhatsApp API (Placeholders - need Multi-Service logic)
router.get('/whatsapp/pairing-code', (req, res) => {
    res.json({ success: true, code: 'WAITING-V2' });
});

router.post('/whatsapp/reset', async (req, res) => {
    res.json({ success: true, message: 'Reset trigger V2 received' });
});

module.exports = router;
