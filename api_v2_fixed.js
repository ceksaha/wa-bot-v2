const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Order = require('../models/order');
const Product = require('../models/product');
const Tenant = require('../models/tenant');

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
        const product = await Product.create({ ...req.body, tenant_id: tenant.id });
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

// Update order status
router.patch('/orders/:id/status', async (req, res) => {
    try {
        const tenant = await getTenant(req.admin.id);
        const order = await Order.findOne({ where: { id: req.params.id, tenant_id: tenant.id } });
        if (!order) return res.status(404).json({ success: false, message: 'Order Not Found' });
        await order.update({ status: req.body.status });
        res.json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Settings (Tenant Profile)
router.get('/settings', async (req, res) => {
    try {
        const tenant = await getTenant(req.admin.id);
        if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
        res.json({ success: true, data: {
            shop_name: tenant.shop_name,
            shop_slogan: tenant.shop_slogan,
            bot_number: tenant.bot_number
        }});
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.patch('/settings/:key', async (req, res) => {
    try {
        const tenant = await getTenant(req.admin.id);
        const { key } = req.params;
        const { value } = req.body;
        if (['shop_name', 'shop_slogan', 'bot_number'].includes(key)) {
            tenant[key] = value;
            await tenant.save();
        }
        res.json({ success: true, data: tenant });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// WhatsApp placeholders
router.get('/whatsapp/pairing-code', (req, res) => {
    res.json({ success: true, code: 'V2-NOT-READY' });
});

router.post('/whatsapp/reset', (req, res) => {
    res.json({ success: true, message: 'V2 reset placeholder' });
});

// Export placeholder
router.get('/export/orders', (req, res) => {
    res.status(501).json({ success: false, message: 'Export not yet implemented in V2' });
});

router.get('/reports/sales', (req, res) => {
    res.json({ success: true, data: [] });
});

module.exports = router;
