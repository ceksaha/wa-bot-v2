// SOCKET CONNECTION
const socket = io();

// STATE
let currentAdmin = null;

// INIT
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    if (currentAdmin) {
        // Join tenant room for private updates
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
        } else {
            window.location.href = '/login';
        }
    } catch (e) {
        window.location.href = '/login';
    }
}

// SOCKET EVENTS
socket.on('new_order', (order) => {
    // Show notification or sound
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
}

function showSubTab(subTabId, el) {
    document.querySelectorAll('.sub-tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.sub-menu-item').forEach(m => m.classList.remove('active'));
    
    document.getElementById(subTabId).classList.add('active');
    el.classList.add('active');
}

// ORDERS
async function fetchOrders() {
    try {
        const res = await fetch('/api/orders');
        const result = await res.json();
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
    
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Belum ada pesanan masuk.</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>#${order.id}</td>
            <td><strong>${order.customer_phone}</strong></td>
            <td>${order.items.map(i => `${i.name} (${i.qty})`).join(', ')}</td>
            <td>Rp ${order.total_price.toLocaleString()}</td>
            <td>${order.address}</td>
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
    `).join('');
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
    const processingOrders = document.getElementById('stat_processingOrders');
    const completedOrders = document.getElementById('stat_completedOrders');

    if (totalOrders) totalOrders.innerText = orders.length;
    
    const revenueValue = orders.filter(o => o.status === 'selesai').reduce((acc, curr) => acc + curr.total_price, 0);
    if (totalRevenue) totalRevenue.innerText = 'Rp ' + revenueValue.toLocaleString();
    
    if (pendingOrders) pendingOrders.innerText = orders.filter(o => o.status === 'pending').length;
    if (processingOrders) processingOrders.innerText = orders.filter(o => o.status === 'proses').length;
    if (completedOrders) completedOrders.innerText = orders.filter(o => o.status === 'selesai').length;
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
        box.innerText = code;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
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
    const list = document.getElementById('productList');
    if (!list) return;
    list.innerHTML = products.map(p => {
        const pJson = JSON.stringify(p).replace(/'/g, "&apos;");
        return `
            <div class="product-card shadow-card">
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <p class="price">Rp ${p.price.toLocaleString()}</p>
                    <p class="desc">${p.description || ''}</p>
                    <span class="badge ${p.is_available ? 'badge-completed' : 'badge-cancelled'}">
                        ${p.is_available ? 'Tersedia' : 'Habis'}
                    </span>
                </div>
                <div class="product-actions">
                    <button class="btn btn-sm btn-outline" onclick='editProduct(${pJson})'>Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p.id}')">Hapus</button>
                </div>
            </div>
        `;
    }).join('');
}

function openProductModal() {
    document.getElementById('modalTitle').innerText = 'Tambah Produk';
    document.getElementById('productForm').reset();
    document.getElementById('prod_id').value = '';
    document.getElementById('productModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('productModal').style.display = 'none';
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

function exportCSV() { window.location.href = '/api/export/orders'; }

async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
}

function toggleConfigSubmenu() {
    const submenu = document.getElementById('config-submenu');
    submenu.style.display = (submenu.style.display === 'none' || !submenu.style.display) ? 'flex' : 'none';
}
