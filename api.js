const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const fs = require('fs');
const path = require('path');
const { sendWhatsAppMessage, getPairingCode } = require('../services/whatsapp');
const Product = require('../models/product');
const Setting = require('../models/setting');

// Get all orders
router.get('/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Products API
router.get('/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ name: 1 });
        res.json({ success: true, data: products });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/products', async (req, res) => {
    try {
        const product = await Product.create(req.body);
        res.status(201).json({ success: true, data: product });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

router.put('/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!product) return res.status(404).json({ success: false, message: 'Product Not Found' });
        res.json({ success: true, data: product });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

router.delete('/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Product Not Found' });
        res.json({ success: true, message: 'Product deleted' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Update order status
router.patch('/orders/:id/status', async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    try {
        const updatedOrder = await Order.findByIdAndUpdate(id, { status }, { new: true });
        if (!updatedOrder) return res.status(404).json({ success: false, message: 'Order Not Found' });
        
        let message = '';
        if (status === 'PROSES') {
            message = '👨‍🍳 *PESANAN DIPROSES* 👩‍🍳\n\nID Order: #' + updatedOrder._id.toString().slice(-6) + '\nStatus: Sedang disiapkan/dimasak.\n\nMohon ditunggu ya!';
        } else if (status === 'COMPLETED') {
            message = '✅ *PESANAN SELESAI* ✅\n\nID Order: #' + updatedOrder._id.toString().slice(-6) + '\nStatus: Pesanan sudah selesai & dibayar.\n\nTerima kasih sudah berbelanja!';
        } else if (status === 'CANCELLED') {
            message = '❌ *PESANAN DIBATALKAN* ❌\n\nID Order: #' + updatedOrder._id.toString().slice(-6) + '\nMohon maaf, pesanan Anda telah dibatalkan oleh admin.';
        }

        if (message) {
            await sendWhatsAppMessage(updatedOrder.customer, message);
        }
        res.json({ success: true, data: updatedOrder });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Settings API
router.get('/settings', async (req, res) => {
    try {
        const settings = await Setting.find();
        const settingsObj = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        res.json({ success: true, data: settingsObj });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.patch('/settings/:key', async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    try {
        const setting = await Setting.findOneAndUpdate(
            { key },
            { value },
            { upsert: true, new: true }
        );
        res.json({ success: true, data: setting });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Reports API
router.get('/reports/sales', async (req, res) => {
    try {
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        const sales = await Order.aggregate([
            { $match: { status: 'COMPLETED', createdAt: { $gte: last7Days } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$total' }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        res.json({ success: true, data: sales });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Export API
router.get('/export/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        let csv = 'ID,Tanggal,Customer,Total,Alamat,Status,Items\n';
        orders.forEach(o => {
            const items = o.items.map(i => i.name + ' (' + i.qty + ')').join('; ');
            const date = o.createdAt.toISOString().split('T')[0];
            csv += o._id + ',' + date + ',' + o.customer + ',' + o.total + ',\"' + o.address.replace(/\"/g, '\"\"') + '\",' + o.status + ',\"' + items.replace(/\"/g, '\"\"') + '\"\n';
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=orders_export.csv');
        res.status(200).send(csv);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// WhatsApp Pairing Code API
router.get('/whatsapp/pairing-code', (req, res) => {
    res.json({ success: true, code: getPairingCode() });
});

// WhatsApp Reset Session API
router.post('/whatsapp/reset', async (req, res) => {
    try {
        const sessionPath = path.join(__dirname, '../auth_info_baileys');
        const { exec } = require('child_process');
        exec(`rm -rf ${sessionPath}`, (err) => {
            if (err) console.error(err);
            setTimeout(() => process.exit(0), 1000);
        });
        res.json({ success: true, message: 'Session reset. Bot will restart.' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
