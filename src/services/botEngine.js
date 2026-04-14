const UserSession = require('../models/userSession');
const Product = require('../models/product');
const Order = require('../models/order');
const Tenant = require('../models/tenant');
const { notifyNewOrder } = require('./socket');

/**
 * Handle incoming WhatsApp messages for a specific tenant
 */
const handleIncomingMessage = async (from, text, tenantId) => {
    const command = text.toLowerCase().trim();
    
    // Find or create session for this phone + tenant
    let [session] = await UserSession.findOrCreate({
        where: { tenant_id: tenantId, phone: from }
    });

    // Ensure session data is correctly parsed (handle possible string-to-json issues)
    const getSessionData = (field) => {
        let data = session[field];
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch(e) { data = field === 'cart' || field === 'tempMenuMap' ? [] : {}; }
        }
        return data || (field === 'cart' || field === 'tempMenuMap' ? [] : {});
    };

    let cart = getSessionData('cart');
    let tempMenuMap = getSessionData('tempMenuMap');

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
        await session.update({ stage: 'START', cart: [] });
        return "❌ Pesanan dibatalkan. Keranjang dikosongkan.";
    }

    if (command === 'keranjang') {
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

    // Reset flow if "pesan" or session is START
    if (command === 'pesan' || session.stage === 'START') {
        const products = await Product.findAll({ where: { tenant_id: tenantId, is_available: true } });
        if (products.length === 0) return `📴 Maaf, menu di *${storeName}* belum tersedia.`;

        let menuStr = `Selamat datang di *${storeName}*.\nSilahkan pilih menu yang akan anda pesan:\n\n`;
        const newMenuMap = [];
        products.forEach((p, idx) => {
            menuStr += `${idx + 1}. ${p.name} - Rp ${p.price.toLocaleString()}\n`;
            newMenuMap.push(p.id);
        });
        
        await session.update({ tempMenuMap: newMenuMap, stage: 'SELECT_PRODUCT' });
        return menuStr;
    } else if (session.stage === 'SELECT_PRODUCT') {
        // Handle input with multiplier (e.g., 3*5)
        let choiceInput = text;
        let quantity = 1;

        if (text.includes('*')) {
            const parts = text.split('*');
            choiceInput = parts[0].trim();
            quantity = parseInt(parts[1]) || 1;
        }

        const choice = parseInt(choiceInput) - 1;
        
        if (!isNaN(choice) && tempMenuMap[choice]) {
            const product = await Product.findByPk(tempMenuMap[choice]);
            if (!product) return "⚠️ Produk tidak ditemukan di database.";

            const existingIdx = cart.findIndex(i => i.id === product.id);
            if (existingIdx > -1) {
                cart[existingIdx].qty += quantity;
            } else {
                cart.push({ id: product.id, name: product.name, price: product.price, qty: quantity });
            }
            
            await session.update({ cart: cart, stage: 'ADD_MORE' });
            return `✅ *${product.name}* (x${quantity}) ditambah ke keranjang!\n\nKetik *1* untuk tambah menu,\natau *2* untuk Checkout.`;
        }
        return "⚠️ Pilih angka menu yang sesuai (contoh: 1 atau 1*5).";
    } else if (session.stage === 'ADD_MORE') {
        if (text === '1') {
            return await handleIncomingMessage(from, 'pesan', tenantId);
        } else if (text === '2') {
            let total = 0;
            let summary = "📄 *RINGKASAN ORDER* 📄\n\n";
            cart.forEach((item, index) => {
                total += item.price * item.qty;
                summary += `${index + 1}. ${item.name} x${item.qty} = Rp ${(item.price * item.qty).toLocaleString()}\n`;
            });
            summary += `\n*TOTAL: Rp ${total.toLocaleString()}*\n\nSiapa *Nama Lengkap* Anda?`;
            await session.update({ stage: 'ASKING_NAME' });
            return summary;
        }
        return "⚠️ Pilih 1 atau 2.";
    } else if (session.stage === 'ASKING_NAME') {
        const name = text.trim();
        if (name.length < 2) return "⚠️ Mohon masukkan Nama Lengkap yang valid.";
        
        await session.update({ tempName: name, stage: 'ASKING_ADDRESS' });
        return `Halo *${name}*, sekarang kirimkan *Alamat Lengkap* pengiriman Anda:`;
    } else if (session.stage === 'ASKING_ADDRESS') {
        const address = text.trim();
        if (address.length < 3) return "⚠️ Mohon masukkan Alamat Lengkap yang jelas.";

        let total = 0;
        cart.forEach(item => total += item.price * item.qty);

        const newOrder = await Order.create({
            tenant_id: tenantId,
            customer_name: session.tempName || 'Pelanggan',
            customer_phone: from,
            items: cart,
            total_price: total,
            address: address,
            status: 'pending'
        });

        // NOTIFY DASHBOARD VIA SOCKET
        notifyNewOrder(tenantId, newOrder);

        await session.update({ stage: 'START', cart: [], tempName: null });
        return `✅ *PESANAN BERHASIL!* ✅\n\nID Order: #${newOrder.id}\nNama: *${session.tempName || 'Pelanggan'}*\nTotal: *Rp ${total.toLocaleString()}*\nAlamat: ${address}\n\nTerima kasih sudah memesan!`;
    }

    return "Ketik *pesan* untuk mulai belanja.";
};

module.exports = { handleIncomingMessage };
