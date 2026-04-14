let socket;

document.addEventListener('DOMContentLoaded', () => {
    initSocket();
    fetchOrders();
    fetchProducts();
    fetchSettings();
});

function initSocket() {
    socket = io();
    
    socket.on('new_order', (order) => {
        alert('📦 Ada Pesanan Baru!');
        fetchOrders();
    });

    socket.on('pairing_code', (code) => {
        updatePairingUI(code);
    });

    // Initial fetch of pairing code
    fetchPairingCode();
}

function updatePairingUI(code) {
    const inlineContainer = document.getElementById('inlinePairingCode');
    const inlineBox = document.getElementById('inlinePairingCodeBox');

    if (code) {
        // Inline badge
        if (inlineContainer) {
            inlineContainer.style.display = 'inline-flex';
            inlineBox.innerText = code;
        }
    } else {
        if (inlineContainer) inlineContainer.style.display = 'none';
    }
}

async function fetchPairingCode() {
    try {
        const res = await fetch('/api/whatsapp/pairing-code');
        const result = await res.json();
        if (result.success && result.code) {
            updatePairingUI(result.code);
        }
    } catch (e) {
        console.error('Error fetching pairing code:', e);
    }
}

async function resetWhatsAppSession() {
    if (!confirm('Peringatan: Ini akan menghapus sesi login WhatsApp saat ini dan me-restart bot untuk mendapatkan kode baru. Lanjutkan?')) return;
    
    try {
        const res = await fetch('/api/whatsapp/reset', { method: 'POST' });
        const result = await res.json();
        if (result.success) {
            alert('Sesi telah di-reset. Mohon tunggu sekitar 10-20 detik lalu refresh halaman untuk melihat kode baru.');
            window.location.reload();
        } else {
            alert('Gagal me-reset sesi: ' + result.error);
        }
    } catch (e) {
        alert('Terjadi kesalahan koneksi.');
    }
}

// TAB NAVIGATION
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
    });
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.style.display = 'block';
        activeTab.classList.add('active');
    }
    event.currentTarget.classList.add('active');
}

function showSubTab(subTabId) {
    document.querySelectorAll('.sub-tab-content').forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
    });
    document.querySelectorAll('.sub-menu-item').forEach(item => item.classList.remove('active'));
    
    const activeSubTab = document.getElementById(subTabId);
    if (activeSubTab) {
        activeSubTab.style.display = 'block';
        activeSubTab.classList.add('active');
    }
    event.currentTarget.classList.add('active');
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
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>#${order._id.toString().slice(-6)}</td>
            <td>${order.customer}</td>
            <td>${order.items.map(i => i.name + ' (' + i.qty + ')').join('<br>')}</td>
            <td>Rp ${order.total.toLocaleString()}</td>
            <td>${order.address}</td>
            <td><span class="badge badge-${order.status.toLowerCase()}">${order.status}</span></td>
            <td>
                <select onchange="updateStatus('${order._id}', this.value)" class="status-select">
                    <option value="PENDING" ${order.status === 'PENDING' ? 'selected' : ''}>Pending</option>
                    <option value="PROSES" ${order.status === 'PROSES' ? 'selected' : ''}>Proses</option>
                    <option value="COMPLETED" ${order.status === 'COMPLETED' ? 'selected' : ''}>Selesai</option>
                    <option value="CANCELLED" ${order.status === 'CANCELLED' ? 'selected' : ''}>Batal</option>
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
    
    const revenueValue = orders.filter(o => o.status === 'COMPLETED').reduce((acc, curr) => acc + curr.total, 0);
    if (totalRevenue) totalRevenue.innerText = 'Rp ' + revenueValue.toLocaleString();
    
    if (pendingOrders) pendingOrders.innerText = orders.filter(o => o.status === 'PENDING').length;
    if (processingOrders) processingOrders.innerText = orders.filter(o => o.status === 'PROSES').length;
    if (completedOrders) completedOrders.innerText = orders.filter(o => o.status === 'COMPLETED').length;
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
                    <span class="badge ${p.isActive ? 'badge-completed' : 'badge-cancelled'}">
                        ${p.isActive ? 'Tersedia' : 'Habis'}
                    </span>
                </div>
                <div class="product-actions">
                    <button class="btn btn-sm btn-outline" onclick='editProduct(${pJson})'>Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p._id}')">Hapus</button>
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
    document.getElementById('prod_id').value = p._id;
    document.getElementById('prod_name').value = p.name;
    document.getElementById('prod_price').value = p.price;
    document.getElementById('prod_description').value = p.description || '';
    document.getElementById('prod_stock').value = p.isActive.toString();
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
            isActive: document.getElementById('prod_stock').value === 'true'
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

function exportCSV() {
    window.location.href = '/api/export/orders';
}

function logout() {
    window.location.href = '/login.html';
}

function toggleConfigSubmenu() {
    const submenu = document.getElementById('config-submenu');
    if (submenu.style.display === 'none' || !submenu.style.display) {
        submenu.style.display = 'flex';
    } else {
        submenu.style.display = 'none';
    }
}
