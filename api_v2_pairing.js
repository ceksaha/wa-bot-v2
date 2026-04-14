const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Order = require('../models/order');
const Product = require('../models/product');
const Tenant = require('../models/tenant');
const { getPairingCode } = require('../services/whatsapp');
const path = require('path');

const getTenant = async (adminId) => {
    return await Tenant.findOne({ where: { admin_id: adminId } });
};

router.get('/orders', async (req, res) => {
    try {
        const tenant = await getTenant(req.admin.id);
        const orders = await Order.findAll({ where: { tenant_id: tenant.id }, order: [['createdAt', 'DESC']] });
        res.json({ success: true, data: orders });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/products', async (req, res) => {
    try {
        const tenant = await getTenant(req.admin.id);
        const products = await Product.findAll({ where: { tenant_id: tenant.id }, order: [['name', 'ASC']] });
        res.json({ success: true, data: products });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/products', async (req, res) => {
    try {
        const tenant = await getTenant(req.admin.id);
        const product = await Product.create({ ...req.body, tenant_id: tenant.id });
        res.status(201).json({ success: true, data: product });
    } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/products/:id', async (req, res) => {
    try {
        const tenant = await getTenant(req.admin.id);
        const product = await Product.findOne({ where: { id: req.params.id, tenant_id: tenant.id } });
        if (!product) return res.status(404).json({ success: false, message: 'Not Found' });
        await product.update(req.body);
        res.json({ success: true, data: product });
    } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.delete('/products/:id', async (req, res) => {
    try {
        const tenant = await getTenant(req.admin.id);
        const product = await Product.findOne({ where: { id: req.params.id, tenant_id: tenant.id } });
        if (!product) return res.status(404).json({ success: false, message: 'Not Found' });
        await product.destroy();
        res.json({ success: true, message: 'Deleted' });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.patch('/orders/:id/status', async (req, res) => {
    try {
        const tenant = await getTenant(req.admin.id);
        const order = await Order.findOne({ where: { id: req.params.id, tenant_id: tenant.id } });
        await order.update({ status: req.body.status });
        res.json({ success: true, data: order });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/settings', async (req, res) => {
    try {
        const tenant = await getTenant(req.admin.id);
        res.json({ success: true, data: { shop_name: tenant.shop_name, shop_slogan: tenant.shop_slogan, bot_number: tenant.bot_number } });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.patch('/settings/:key', async (req, res) => {
    try {
        const tenant = await getTenant(req.admin.id);
        const { key } = req.params; const { value } = req.body;
        if (['shop_name', 'shop_slogan', 'bot_number'].includes(key)) {
            tenant[key] = value; await tenant.save();
        }
        res.json({ success: true, data: tenant });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/whatsapp/pairing-code', async (req, res) => {
    try {
        const tenant = await getTenant(req.admin.id);
        const code = getPairingCode(tenant.id);
        res.json({ success: true, code });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/whatsapp/reset', async (req, res) => {
    try {
        const tenant = await getTenant(req.admin.id);
        const fs = require('fs');
        const authPath = path.join(__dirname, ../auth/tenant_);
        if (fs.existsSync(authPath)) {
            // Very aggressive reset
            const { exec } = require('child_process');
            exec(
m -rf , (err) => {
                 setTimeout(() => process.exit(0), 1000); // Restart whole app for now, or just re-startSession
            });
        }
        res.json({ success: true, message: 'Resetting session...' });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
