const UserSession = require('../models/userSession');
const Product = require('../models/product');
const Order = require('../models/order');
const Tenant = require('../models/tenant');

// Helper: safely parse JSON fields from MySQL (could be string or object)
function safeJSON(val, fallback) {
    if (!val) return fallback;
    if (typeof val === 'string') {
        try { return JSON.parse(val); } catch(e) { return fallback; }
    }
    return val;
}

/**
 * Handle incoming WhatsApp messages for a specific tenant
 */
const handleIncomingMessage = async (from, text, tenantId) => {
    const command = text.toLowerCase().trim();
    
    // Find or create session for this phone + tenant
    let [session, created] = await UserSession.findOrCreate({
        where: { tenant_id: tenantId, phone: from },
        defaults: { stage: 'START', cart: [], tempMenuMap: {} }
    });

    // Reload to ensure fresh data from DB
    await session.reload();
    
    // Safely parse JSON fields
    const cart = safeJSON(session.cart, []);
    const menuMap = safeJSON(session.tempMenuMap, {});

    // Get Tenant details
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) return "⚠️ Error: Tenant tidak ditemukan.";

    const storeName = tenant.shop_name || "Toko Kami";
    const shopSlogan = tenant.shop_slogan || "Pusatnya Belanja";

    // Status Tracking Command
    if (command.startsWith('status')) {
        const orderIdPart = command.split(' ')[1];
        if (!orderIdPart) return "🔍 Ketik *status [ID_PESANAN]* untuk melacak.";
        
        try {
            const orders = await Order.findAll({ 
                where: { tenant_id: tenantId, customer_phone: from },
                order: [['createdAt', 'DESC']]
            });
            const matchingOrder = orders.find(o => o.id.toString().endsWith(orderIdPart) || o.id.toString() === orderIdPart);
            
            if (!matchingOrder) return "❌ Pesanan tidak ditemukan atau bukan milik Anda.";
            return `📦 *STATUS PESANAN* 📦\n\nID: #${matchingOrder.id}\nStatus: *${matchingOrder.status}*\nTotal: Rp ${matchingOrder.total_price.toLocaleString()}\nAlamat: ${matchingOrder.address}`;
        } catch (e) {
            return "⚠️ Terjadi kesalahan saat mencari pesanan.";
        }
    }

    if (command === 'batal') {
        await session.update({ stage: 'START', cart: [], tempMenuMap: [] });
        return "❌ Pesanan dibatalkan. Keranjang dikosongkan.";
    }

    if (command === 'keranjang') {
        const cart = session.cart || [];
        if (cart.length === 0) return "🛒 Keranjang Anda masih kosong.";
        let total = 0;
        let summary = "🛒 *KERANJANG ANDA* 🛒\n\n";
        for(let i=0; i<cart.length; i++) {
            const item = cart[i];
            const subtotal = item.price * item.qty;
            total += subtotal;
            summary += `${i+1}. ${item.name} x${item.qty} = Rp ${subtotal.toLocaleString()}\n`;
        }
        summary += `\n*TOTAL: Rp ${total.toLocaleString()}*`;
        return summary;
    }

    // Reset flow if "menu" or session is START
    if (command === 'menu' || session.stage === 'START') {
        const products = await Product.findAll({ 
            where: { tenant_id: tenantId, is_available: true },
            order: [['price', 'ASC']]
        });
        if (products.length === 0) return `📴 Maaf, menu di *${storeName}* belum tersedia.`;

        let menuStr = `🌟 *MENU ${storeName.toUpperCase()}* 🌟\n${shopSlogan}\n\nPilih angka untuk memesan:\n`;
        const newMenuMap = {};
        products.forEach((p, idx) => {
            const num = idx + 1;
            menuStr += `${num}. ${p.name} - Rp ${p.price.toLocaleString()}\n`;
            newMenuMap[num.toString()] = { id: p.id, name: p.name, price: p.price };
        });
        
        await session.update({ tempMenuMap: newMenuMap, stage: 'SELECT_PRODUCT', cart: cart });
        return menuStr;
    }

    if (session.stage === 'SELECT_PRODUCT') {
        const chosen = menuMap[text.trim()];
        
        if (chosen) {
            // Verify product still exists
            const product = await Product.findOne({ where: { id: chosen.id, tenant_id: tenantId } });
            if (!product) return "⚠️ Produk sudah tidak tersedia.";

            let currentCart = Array.isArray(cart) ? [...cart] : [];
            const existingIdx = currentCart.findIndex(i => i.id === product.id);
            if (existingIdx > -1) {
                currentCart[existingIdx].qty += 1;
            } else {
                currentCart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
            }
            
            await session.update({ cart: currentCart, stage: 'ADD_MORE' });
            return `✅ *${product.name}* ditambah!\n\nPilih *1* untuk tambah menu,\natau *2* untuk Checkout.`;
        }
        return "⚠️ Pilih angka yang sesuai dengan menu.";
    }

    if (session.stage === 'ADD_MORE') {
        if (text.trim() === '1') {
            // Show menu again
            const products = await Product.findAll({ 
                where: { tenant_id: tenantId, is_available: true },
                order: [['price', 'ASC']]
            });
            if (products.length === 0) return `📴 Maaf, menu di *${storeName}* belum tersedia.`;

            let menuStr = `🌟 *MENU ${storeName.toUpperCase()}* 🌟\n${shopSlogan}\n\nPilih angka untuk memesan:\n`;
            const newMenuMap = {};
            products.forEach((p, idx) => {
                const num = idx + 1;
                menuStr += `${num}. ${p.name} - Rp ${p.price.toLocaleString()}\n`;
                newMenuMap[num.toString()] = { id: p.id, name: p.name, price: p.price };
            });
            
            await session.update({ tempMenuMap: newMenuMap, stage: 'SELECT_PRODUCT' });
            return menuStr;
        } else if (text.trim() === '2') {
            if (cart.length === 0) return "🛒 Keranjang kosong. Ketik *menu* untuk mulai belanja.";

            let total = 0;
            let summary = "📄 *RINGKASAN ORDER* 📄\n\n";
            cart.forEach((item, index) => {
                total += item.price * item.qty;
                summary += `${index + 1}. ${item.name} x${item.qty} = Rp ${(item.price * item.qty).toLocaleString()}\n`;
            });
            summary += `\n*TOTAL: Rp ${total.toLocaleString()}*\n\nKirim *Alamat Lengkap* Anda:`;
            await session.update({ stage: 'ASKING_ADDRESS' });
            return summary;
        }
        return "⚠️ Pilih *1* (tambah menu) atau *2* (checkout).";
    }

    if (session.stage === 'ASKING_ADDRESS') {
        let total = 0;
        cart.forEach(item => total += item.price * item.qty);

        const newOrder = await Order.create({
            tenant_id: tenantId,
            customer_phone: from,
            items: cart,
            total_price: total,
            address: text,
            status: 'pending'
        });

        // Notify dashboard via socket
        try {
            const { notifyNewOrder } = require('./socket');
            notifyNewOrder(tenantId, newOrder);
        } catch(e) { /* silent */ }

        await session.update({ stage: 'START', cart: [], tempMenuMap: {} });
        return `✅ *PESANAN BERHASIL!* ✅\n\nID Order: #${newOrder.id}\nTotal: *Rp ${total.toLocaleString()}*\nAlamat: ${text}\n\nKetik *status ${newOrder.id}* untuk cek status.`;
    }

    return "Ketik *menu* untuk mulai belanja.";
};

module.exports = { handleIncomingMessage };
