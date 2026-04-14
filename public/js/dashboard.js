// SOCKET CONNECTION
const socket = io();

// STATE
let currentAdmin = null;

// INIT
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    if (currentAdmin) {
        socket.emit('join_tenant', currentAdmin.tenantId);
        
        fetchOrders();
        fetchProducts();
        fetchSettings();
        fetchPairingCode();
    }
});

async function checkAuth() {
    try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success) {
            currentAdmin = data.admin;
            // Show Super Admin menu if applicable
            if (currentAdmin.role === 'super_admin') {
                const superBtn = document.getElementById('menu_superAdmin');
                if (superBtn) superBtn.style.display = 'block';
            }
        } else {
            window.location.href = '/login';
        }
    } catch (e) {
        window.location.href = '/login';
    }
}

// SOCKET EVENTS
socket.on('new_order', (order) => {
    console.log('New order received via socket:', order);
    playNotificationSound();
    fetchOrders(); 
});

socket.on('pairing_code', (data) => {
    updatePairingCodeUI(data.code);
});

function playNotificationSound() {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    audio.play().catch(e => console.log('Audio play failed'));
}

// TABS NAVIGATION
function showTab(tabId, el) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    el.classList.add('active');
    
    // Toggle Sub-nav visibility
    const subNav = document.getElementById('config-sub-nav');
    if (subNav) subNav.style.display = (tabId === 'configTab') ? 'flex' : 'none';
}

function showSubTab(subTabId, el) {
    document.querySelectorAll('.sub-tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.sub-menu-item').forEach(m => m.classList.remove('active'));
    
    document.getElementById(subTabId).classList.add('active');
    el.classList.add('active');
}

// ORDERS
async function fetchOrders() {
    console.log('Fetching orders...');
    try {
        const res = await fetch('/api/orders');
        const result = await res.json();
        console.log('Orders result:', result);
        if (result.success) {
            renderOrders(result.data);
            updateStats(result.data);
        }
    } catch (e) {
        console.error('Error fetching orders:', e);
    }
}

function renderOrders(orders) {
    const tbody = document.querySelector('#ordersTable tbody');
    if (!tbody) return;
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Belum ada pesanan masuk.</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => {
        // Safe parsing for items
        let itemsArr = [];
        try {
            itemsArr = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            if (!Array.isArray(itemsArr)) itemsArr = [];
        } catch (e) { itemsArr = []; }

        const itemsStr = itemsArr.map(i => `${i.name} (${i.qty})`).join(', ') || 'N/A';
        const total = typeof order.total_price === 'string' ? parseFloat(order.total_price) : order.total_price;

        return `
            <tr>
                <td>#${order.id}</td>
                <td>
                    <div style="display:flex; flex-direction:column;">
                        <strong>${order.customer_name || 'Pelanggan'}</strong>
                        <small style="color:var(--text-muted);">${order.customer_phone}</small>
                    </div>
                </td>
                <td style="max-width: 150px; font-size: 0.85rem; color: #64748b;">${order.address}</td>
                <td>${itemsStr}</td>
                <td>Rp ${isNaN(total) ? '0' : total.toLocaleString()}</td>
                <td><span class="badge badge-${order.status.toLowerCase()}">${order.status}</span></td>
                <td>
                    <select onchange="updateStatus('${order.id}', this.value)" class="status-select">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="proses" ${order.status === 'proses' ? 'selected' : ''}>Proses</option>
                        <option value="selesai" ${order.status === 'selesai' ? 'selected' : ''}>Selesai</option>
                        <option value="dibatalkan" ${order.status === 'dibatalkan' ? 'selected' : ''}>Batal</option>
                    </select>
                </td>
            </tr>
        `;
    }).join('');
}

async function exportOrders() {
    try {
        const response = await fetch('/api/orders/export', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Gagal export data');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Laporan_Penjualan.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    } catch (e) {
        alert(e.message);
    }
}

async function updateStatus(id, status) {
    try {
        const res = await fetch(`/api/orders/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (res.ok) fetchOrders();
    } catch (e) {
        console.error('Error updating status:', e);
    }
}

function updateStats(orders) {
    const totalOrders = document.getElementById('stat_totalOrders');
    const totalRevenue = document.getElementById('stat_totalRevenue');
    const pendingOrders = document.getElementById('stat_pendingOrders');
    
    if (!orders) orders = [];

    if (totalOrders) totalOrders.innerText = orders.length;
    
    const revenueValue = orders.filter(o => o.status === 'selesai').reduce((acc, curr) => {
        const price = typeof curr.total_price === 'string' ? parseFloat(curr.total_price) : curr.total_price;
        return acc + (isNaN(price) ? 0 : price);
    }, 0);
    
    if (totalRevenue) totalRevenue.innerText = 'Rp ' + revenueValue.toLocaleString();
    if (pendingOrders) pendingOrders.innerText = orders.filter(o => o.status === 'pending').length;
}

// SETTINGS
async function fetchSettings() {
    try {
        const res = await fetch('/api/settings');
        const result = await res.json();
        if (result.success) {
            const data = result.data;
            if (document.getElementById('set_shopName')) document.getElementById('set_shopName').value = data.shop_name || '';
            if (document.getElementById('set_shopSlogan')) document.getElementById('set_shopSlogan').value = data.shop_slogan || '';
            if (document.getElementById('set_botNumber')) document.getElementById('set_botNumber').value = data.bot_number || '';
            if (document.getElementById('set_tunnelUrl')) document.getElementById('set_tunnelUrl').value = data.tunnel_url || 'Sedang memuat...';
            
            if (document.getElementById('shop_name_display')) document.getElementById('shop_name_display').innerText = data.shop_name || 'My Shop';
            if (document.getElementById('shop_slogan_display')) document.getElementById('shop_slogan_display').innerText = data.shop_slogan || 'Welcome';
        }
    } catch (e) {
        console.error('Error fetching settings:', e);
    }
}

const settingsForm = document.getElementById('settingsForm');
if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const settings = {
            shop_name: document.getElementById('set_shopName').value,
            shop_slogan: document.getElementById('set_shopSlogan').value,
            bot_number: document.getElementById('set_botNumber').value
        };

        for (const [key, value] of Object.entries(settings)) {
            await fetch(`/api/settings/${key}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value })
            });
        }
        alert('Pengaturan Berhasil Disimpan!');
        fetchSettings();
    });
}

// PAIRING CODE
async function fetchPairingCode() {
    try {
        const res = await fetch('/api/whatsapp/pairing-code');
        const data = await res.json();
        updatePairingCodeUI(data.code);
    } catch (e) {
        console.error('Error fetching pairing code:', e);
    }
}

function updatePairingCodeUI(code) {
    const badge = document.getElementById('inlinePairingCode');
    const box = document.getElementById('inlinePairingCodeBox');
    if (code) {
        if (box) box.innerText = code;
        if (badge) badge.style.display = 'inline-flex';
    } else {
        if (badge) badge.style.display = 'none';
    }
}

async function resetWhatsAppSession() {
    if (!confirm('Yakin ingin reset sesi WhatsApp? Bot akan restart.')) return;
    try {
        await fetch('/api/whatsapp/reset', { method: 'POST' });
        alert('Sedang mereset... Tunggu sebentar lalu refresh halaman.');
    } catch (e) { console.error(e); }
}

// PRODUCTS
async function fetchProducts() {
    try {
        const res = await fetch('/api/products');
        const result = await res.json();
        if (result.success) renderProducts(result.data);
    } catch (e) {
        console.error('Error fetching products:', e);
    }
}

function renderProducts(products) {
    const tbody = document.querySelector('#productTable tbody');
    if (!tbody) return;
    
    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">Belum ada produk.</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(p => {
        const pJson = JSON.stringify(p).replace(/'/g, "&apos;");
        return `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td>Rp ${p.price.toLocaleString()}</td>
                <td>
                    <span class="badge ${p.is_available ? 'badge-completed' : 'badge-cancelled'}">
                        ${p.is_available ? 'Tersedia' : 'Habis'}
                    </span>
                </td>
                <td>
                    <div class="product-actions">
                        <button class="btn btn-sm btn-outline" onclick='editProduct(${pJson})'>Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p.id}')">Hapus</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openProductModal() {
    document.getElementById('modalTitle').innerText = 'Tambah Produk';
    if (document.getElementById('productForm')) document.getElementById('productForm').reset();
    if (document.getElementById('prod_id')) document.getElementById('prod_id').value = '';
    if (document.getElementById('productModal')) document.getElementById('productModal').style.display = 'flex';
}

function closeModal() {
    if (document.getElementById('productModal')) document.getElementById('productModal').style.display = 'none';
}

function editProduct(p) {
    document.getElementById('modalTitle').innerText = 'Edit Produk';
    document.getElementById('prod_id').value = p.id;
    document.getElementById('prod_name').value = p.name;
    document.getElementById('prod_price').value = p.price;
    document.getElementById('prod_description').value = p.description || '';
    document.getElementById('prod_stock').value = p.is_available.toString();
    document.getElementById('productModal').style.display = 'flex';
}

const productForm = document.getElementById('productForm');
if (productForm) {
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('prod_id').value;
        const body = {
            name: document.getElementById('prod_name').value,
            price: document.getElementById('prod_price').value,
            description: document.getElementById('prod_description').value,
            is_available: document.getElementById('prod_stock').value === 'true'
        };

        const url = id ? `/api/products/${id}` : '/api/products';
        const method = id ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            closeModal();
            fetchProducts();
        }
    });
}

async function deleteProduct(id) {
    if (!confirm('Yakin ingin menghapus produk ini?')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    fetchProducts();
}

function searchTable(input) {
    const filter = input.value.toLowerCase();
    const rows = document.querySelectorAll('#ordersTable tbody tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(filter) ? '' : 'none';
    });
}

async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
}

// =======================
// MANUAL ORDER
// =======================
let allProducts = [];

async function openManualOrderModal() {
    // Fetch products if not already loaded
    if (allProducts.length === 0) {
        const res = await fetch('/api/products');
        const result = await res.json();
        allProducts = (result.success ? result.data : []).filter(p => p.is_available);
    }
    if (allProducts.length === 0) {
        return alert('Belum ada produk tersedia. Tambah produk dulu di menu Konfigurasi.');
    }

    // Reset form
    document.getElementById('manualOrderForm').reset();
    document.getElementById('mo_items_container').innerHTML = '';
    document.getElementById('mo_total').innerText = 'Rp 0';

    // Add first item row
    addManualOrderItem();

    document.getElementById('manualOrderModal').style.display = 'flex';
}

function closeManualOrderModal() {
    document.getElementById('manualOrderModal').style.display = 'none';
}

function addManualOrderItem() {
    const container = document.getElementById('mo_items_container');
    const idx = container.children.length;
    const options = allProducts.map(p =>
        `<option value="${p.id}" data-price="${p.price}" data-name="${p.name}">${p.name} - Rp ${Number(p.price).toLocaleString()}</option>`
    ).join('');

    const row = document.createElement('div');
    row.className = 'manual-item-row';
    row.style.cssText = 'display:flex; gap:0.75rem; align-items:center; margin-bottom:0.75rem;';
    row.innerHTML = `
        <select class="mo_product" style="flex:2; padding:0.6rem 0.75rem; border:1px solid #e2e8f0; border-radius:0.5rem;" onchange="calcManualTotal()">
            ${options}
        </select>
        <input type="number" class="mo_qty" value="1" min="1" style="width:70px; padding:0.6rem; border:1px solid #e2e8f0; border-radius:0.5rem; text-align:center;" onchange="calcManualTotal()">
        <button type="button" onclick="removeManualItem(this)" style="background:#fef2f2; color:#ef4444; border:none; border-radius:0.5rem; padding:0.5rem 0.75rem; cursor:pointer; font-size:1rem;">✕</button>
    `;
    container.appendChild(row);
    calcManualTotal();
}

function removeManualItem(btn) {
    const row = btn.closest('.manual-item-row');
    const container = document.getElementById('mo_items_container');
    if (container.children.length > 1) {
        row.remove();
        calcManualTotal();
    }
}

function calcManualTotal() {
    let total = 0;
    document.querySelectorAll('.manual-item-row').forEach(row => {
        const sel = row.querySelector('.mo_product');
        const qty = parseInt(row.querySelector('.mo_qty').value) || 0;
        const price = parseFloat(sel.options[sel.selectedIndex].dataset.price) || 0;
        total += price * qty;
    });
    document.getElementById('mo_total').innerText = 'Rp ' + total.toLocaleString();
}

const manualOrderForm = document.getElementById('manualOrderForm');
if (manualOrderForm) {
    manualOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('mo_name').value.trim();
        const phone = document.getElementById('mo_phone').value.trim() || 'Manual';
        const address = document.getElementById('mo_address').value.trim() || '-';

        const items = [];
        let total = 0;
        document.querySelectorAll('.manual-item-row').forEach(row => {
            const sel = row.querySelector('.mo_product');
            const qty = parseInt(row.querySelector('.mo_qty').value) || 1;
            const price = parseFloat(sel.options[sel.selectedIndex].dataset.price) || 0;
            const pname = sel.options[sel.selectedIndex].dataset.name;
            const pid = sel.value;
            items.push({ id: pid, name: pname, price, qty });
            total += price * qty;
        });

        if (!name) return alert('Nama pelanggan wajib diisi!');
        if (items.length === 0) return alert('Pilih minimal 1 item!');

        try {
            const res = await fetch('/api/orders/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer_name: name, customer_phone: phone, address, items, total_price: total })
            });
            const result = await res.json();
            if (result.success) {
                closeManualOrderModal();
                fetchOrders();
                alert('✅ Pesanan manual berhasil ditambahkan!');
            } else {
                alert('Gagal: ' + result.error);
            }
        } catch (err) {
            alert('Terjadi kesalahan: ' + err.message);
        }
    });
}

