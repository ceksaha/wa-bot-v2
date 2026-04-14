const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Order = require('../models/order');
const Product = require('../models/product');
const Tenant = require('../models/tenant');
const { getPairingCode } = require('../services/whatsapp');
const path = require('path');
const fs = require('fs');

const getTenant = async (adminId) => {
    return await Tenant.findOne({ where: { admin_id: adminId } });
};

// Helper: safely parse JSON fields from MySQL (could be string or object)
function safeJSON(val, fallback) {
    if (!val) return fallback;
    if (typeof val === 'string') {
        try { return JSON.parse(val); } catch(e) { return fallback; }
    }
    return val;
}

router.post('/orders/manual', async (req, res) => {
    try {
        const tenant = await getTenant(req.admin.id);
        const { customer_name, customer_phone, address, items, total_price } = req.body;

        if (!customer_name || !items || items.length === 0) {
            return res.status(400).json({ success: false, error: 'Nama dan item wajib diisi.' });
        }

        const newOrder = await Order.create({
            tenant_id: tenant.id,
            customer_name: customer_name,
            customer_phone: customer_phone || 'Manual',
            items: items,
            total_price: Number(total_price) || 0,
            address: address || '-',
            status: 'pending'
        });

        // Notify dashboard via socket
        try {
            const { notifyNewOrder } = require('../services/socket');
            notifyNewOrder(tenant.id, newOrder);
        } catch(e) { /* silent */ }

        res.status(201).json({ success: true, data: newOrder });
    } catch (error) {
        console.error('[API] Manual order error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/orders', async (req, res) => {
    try {
        const tenant = await getTenant(req.admin.id);
        if (!tenant) return res.json({ success: true, data: [] });
        
        console.log(`[API] Fetching orders for Admin: ${req.admin.id}, Tenant: ${tenant.id}`);
        const orders = await Order.findAll({ 
            where: { tenant_id: tenant.id }, 
            order: [['createdAt', 'DESC']] 
        });
        console.log(`[API] Found ${orders.length} orders.`);
        res.json({ success: true, data: orders });
    } catch (error) { 
        console.error('[API] Error fetching orders:', error.message);
        res.status(500).json({ success: false, error: error.message }); 
    }
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
        if (!order) return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });

        const oldStatus = order.status;
        const newStatus = req.body.status;
        await order.update({ status: newStatus });

        // Auto-notify customer via WhatsApp
        const { sendWhatsAppMessage } = require('../services/whatsapp');
        let statusMsg = '';
        switch(newStatus.toLowerCase()) {
            case 'proses': statusMsg = 'sedang *DIPROSES*'; break;
            case 'selesai': statusMsg = 'sudah *SELESAI* dan siap!'; break;
            case 'dibatalkan': statusMsg = 'telah *DIBATALKAN*'; break;
            default: statusMsg = `berubah menjadi *${newStatus.toUpperCase()}*`;
        }

        const msg = `📦 *UPDATE PESANAN* 📦\n\nHalo *${order.customer_name || 'Pelanggan'}*! Pesanan Anda dengan ID *#${order.id}* saat ini ${statusMsg}.\n\nTerima kasih!\n*${tenant.shop_name}*`;
        await sendWhatsAppMessage(tenant.id, order.customer_phone, msg);

        res.json({ success: true, data: order });
    } catch (error) { 
        console.error('[API] Status update error:', error.message);
        res.status(500).json({ success: false, error: error.message }); 
    }
});

router.get('/orders/export', async (req, res) => {
    try {
        const tenant = await getTenant(req.admin.id);
        const orders = await Order.findAll({ 
            where: { tenant_id: tenant.id },
            order: [['createdAt', 'DESC']]
        });

        let csv = 'ID,Tanggal,Nama,WhatsApp,Detail Item,Total,Alamat,Status\n';
        orders.forEach(o => {
            const itemList = safeJSON(o.items, []);
            // Join items with pipe separator to keep in one cell
            const itemDetail = itemList
                .map(i => `${i.name} x${i.qty} (Rp ${(i.price * i.qty).toLocaleString('id-ID')})`)
                .join(' | ');
            const date = new Date(o.createdAt).toLocaleString('id-ID');
            const row = [
                o.id,
                `"${date}"`,
                `"${o.customer_name || 'Pelanggan'}"`,
                `"${o.customer_phone}"`,
                `"${itemDetail}"`,
                `"Rp ${Number(o.total_price).toLocaleString('id-ID')}"`,
                `"${(o.address || '-').replace(/\n/g, ' ')}"`,
                o.status
            ].join(',');
            csv += row + '\n';
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=Laporan_Penjualan_${(tenant.shop_name || 'Toko').replace(/ /g, '_')}.csv`);
        // Add BOM for Excel to properly read UTF-8 with Indonesian characters
        res.send('\uFEFF' + csv);
    } catch (error) {
        console.error('[API] Export error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
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
        const authPath = path.join(__dirname, '../../../sessions', `tenant_${tenant.id}`);
        if (fs.existsSync(authPath)) {
            const { exec } = require('child_process');
            exec(`rm -rf ${authPath}`, (err) => {
                 setTimeout(() => process.exit(0), 1000);
            });
        }
        res.json({ success: true, message: 'Resetting session...' });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
