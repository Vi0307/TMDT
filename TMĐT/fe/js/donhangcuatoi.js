/**
 * donhangcuatoi.js
 * Lấy danh sách đơn hàng từ API và render lên trang donhangcuatoi.html
 *
 * API:
 *   GET /api/orders/my-orders?status=&page=&limit=
 *   GET /api/auth/me
 *   PUT /api/orders/:id/cancel
 *
 * Status map (FE tab → API):
 *   all        → không filter
 *   processing → Chờ xác nhận
 *   shipping   → Đang giao
 *   delivered  → Đã giao
 *   cancelled  → Đã hủy
 */

const API_URL = 'http://localhost:3000/api';

const TAB_STATUS = {
    all:       '',
    processing: 'processing',
    shipping:   'delivering',
    delivered:  'delivered',
    cancelled:  'cancelled'
};

// Badge config theo trạng thái
const STATUS_BADGE = {
    'Chờ xác nhận': { label: 'ĐANG XỬ LÝ',    cls: 'bg-surface-variant text-on-surface' },
    'Đang giao':    { label: 'ĐANG GIAO HÀNG', cls: 'bg-primary-container/20 text-primary' },
    'Đã giao':      { label: 'ĐÃ GIAO HÀNG',   cls: 'bg-green-100 text-green-800' },
    'Đã hủy':       { label: 'ĐÃ HỦY',         cls: 'bg-error-container/20 text-error' }
};

let currentTab = 'all';
let allOrders  = [];   // cache toàn bộ đơn hàng

// ─── Khởi động ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'dangnhap.html';
        return;
    }

    await Promise.all([loadUserInfo(), loadOrders()]);
    setupTabs();
});

// ─── Load thông tin user vào sidebar ─────────────────────────────────────────
async function loadUserInfo() {
    const token = localStorage.getItem('token');
    try {
        const res  = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) {
            const u = json.data;
            const nameEl = document.getElementById('user-name');
            const joinEl = document.getElementById('user-join');
            if (nameEl) nameEl.textContent = u.ten;
            if (joinEl && u.ngayTao) {
                const year = new Date(u.ngayTao).getFullYear();
                joinEl.textContent = `Thành viên từ ${year}`;
            }
        }
    } catch (err) {
        // Fallback localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const nameEl = document.getElementById('user-name');
        if (nameEl && user.ten) nameEl.textContent = user.ten;
    }
}

// ─── Load đơn hàng ───────────────────────────────────────────────────────────
async function loadOrders() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('orders-container');
    container.innerHTML = renderSkeleton();

    try {
        const res  = await fetch(`${API_URL}/orders/my-orders?limit=50`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();

        if (!json.success) {
            showEmpty('Không thể tải đơn hàng. Vui lòng thử lại.');
            return;
        }

        allOrders = json.data;
        renderOrders(currentTab);
        updateTabCounts();

    } catch (err) {
        console.error('loadOrders error:', err);
        showEmpty('Không thể kết nối server.');
    }
}

// ─── Render đơn hàng theo tab ─────────────────────────────────────────────────
function renderOrders(tab) {
    currentTab = tab;
    const container = document.getElementById('orders-container');

    // Lọc theo tab
    const filtered = tab === 'all'
        ? allOrders
        : allOrders.filter(o => {
            const s = o.tenTrangThai;
            if (tab === 'processing') return s === 'Chờ xác nhận';
            if (tab === 'shipping')   return s === 'Đang giao';
            if (tab === 'delivered')  return s === 'Đã giao';
            if (tab === 'cancelled')  return s === 'Đã hủy';
            return true;
        });

    if (filtered.length === 0) {
        showEmpty('Không có đơn hàng nào trong mục này.');
        return;
    }

    container.innerHTML = filtered.map(order => renderOrderCard(order)).join('');
}

// ─── Render 1 card đơn hàng ───────────────────────────────────────────────────
function formatDate(dateStr) {
    if (!dateStr) return '—';
    // Lấy phần YYYY-MM-DD trước khi parse để tránh UTC offset làm lệch ngày
    const datePart = (dateStr + '').split('T')[0];
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
}

function renderOrderCard(order) {
    const badge   = STATUS_BADGE[order.tenTrangThai] || { label: order.tenTrangThai, cls: 'bg-surface-variant text-on-surface' };
    const tongFmt = Number(order.tongTien).toLocaleString('vi-VN') + ' ₫';
    const ngayDat = formatDate(order.ngayDat);

    // Nút hành động theo trạng thái
    let actions = '';
    if (order.tenTrangThai === 'Chờ xác nhận') {
        actions = `
            <button onclick="cancelOrder(${order.maDonHang})"
                class="flex-1 md:flex-none px-6 py-2 border border-outline text-on-surface font-label-caps rounded hover:bg-surface-variant transition-colors">
                HỦY ĐƠN
            </button>`;
    } else if (order.tenTrangThai === 'Đang giao') {
        actions = `
            <button class="flex-1 md:flex-none px-6 py-2 border border-outline text-on-surface font-label-caps rounded hover:bg-surface-variant transition-colors">
                LIÊN HỆ ĐVVC
            </button>`;
    } else if (order.tenTrangThai === 'Đã giao') {
        actions = `
            <button onclick="window.location.href='hoanhang.html?id=${order.maDonHang}'"
                class="flex-1 md:flex-none px-6 py-2 border border-error text-error font-label-caps rounded hover:bg-error-container/20 transition-colors">
                TRẢ HÀNG / HOÀN TIỀN
            </button>
            <button onclick="window.location.href='danhgia.html?id=${order.maDonHang}'"
                class="flex-1 md:flex-none px-6 py-2 border border-outline text-on-surface font-label-caps rounded hover:bg-surface-variant transition-colors">
                ĐÁNH GIÁ
            </button>`;
    } else if (order.tenTrangThai === 'Đã hủy') {
        actions = `
            <button onclick="window.location.href='sanpham.html'"
                class="flex-1 md:flex-none px-6 py-2 border border-outline text-on-surface font-label-caps rounded hover:bg-surface-variant transition-colors">
                MUA LẠI
            </button>`;
    }

    // Thông tin vận chuyển
    const vcInfo = order.phuongThucVanChuyen
        ? `<p class="text-xs text-on-surface-variant mt-1">
               <span class="material-symbols-outlined text-[14px] align-middle">local_shipping</span>
               ${order.phuongThucVanChuyen}
               ${order.ngayDuKienGiao ? '· Dự kiến: ' + formatDate(order.ngayDuKienGiao) : ''}
           </p>`
        : '';

    return `
        <div class="order-card bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-surface-variant hover:shadow-md transition-shadow">
            <!-- Header -->
            <div class="flex flex-col md:flex-row justify-between md:items-center border-b border-outline-variant pb-4 mb-4 gap-4">
                <div>
                    <a href="chitietdonhang.html?id=${order.maDonHang}"
                       class="font-label-caps text-outline hover:text-primary underline transition-colors cursor-pointer">
                        MÃ ĐƠN: #${order.maDonHang}
                    </a>
                    <span class="text-on-surface-variant font-body-md md:ml-4 block md:inline mt-1 md:mt-0">
                        Ngày đặt: ${ngayDat}
                    </span>
                    ${vcInfo}
                </div>
                <div class="px-3 py-1 ${badge.cls} font-label-caps rounded-full text-[10px] self-start md:self-auto text-center">
                    ${badge.label}
                </div>
            </div>

            <!-- Sản phẩm (hiển thị số lượng) -->
            <div class="flex items-center gap-3 mb-4">
                <span class="material-symbols-outlined text-on-surface-variant">inventory_2</span>
                <span class="font-body-md text-on-surface-variant">
                    ${order.soLuongSanPham} sản phẩm
                    · ${order.phuongThucThanhToan || '—'}
                </span>
            </div>

            <!-- Footer -->
            <div class="border-t border-outline-variant pt-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div class="font-body-md text-on-surface-variant w-full md:w-auto text-right md:text-left">
                    Tổng cộng:
                    <span class="font-headline-md text-error font-semibold ml-2">${tongFmt}</span>
                </div>
                <div class="flex flex-wrap gap-3 w-full md:w-auto justify-end">
                    ${actions}
                    <a href="chitietdonhang.html?id=${order.maDonHang}"
                       class="text-center flex-1 md:flex-none px-6 py-2 bg-secondary text-on-secondary font-label-caps rounded shadow hover:opacity-90 transition-opacity block">
                        CHI TIẾT
                    </a>
                </div>
            </div>
        </div>
    `;
}

// ─── Hủy đơn hàng ────────────────────────────────────────────────────────────
async function cancelOrder(maDonHang) {
    if (!confirm(`Bạn có chắc muốn hủy đơn hàng #${maDonHang}?`)) return;

    const token = localStorage.getItem('token');
    try {
        const res  = await fetch(`${API_URL}/orders/${maDonHang}/cancel`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ lyDoHuy: 'Khách hàng hủy đơn' })
        });
        const json = await res.json();

        if (json.success) {
            showToast('Đã hủy đơn hàng thành công.');
            await loadOrders(); // Reload lại danh sách
        } else {
            showToast(json.message, 'error');
        }
    } catch {
        showToast('Không thể kết nối server.', 'error');
    }
}

// ─── Cập nhật số lượng đơn trên tab ──────────────────────────────────────────
function updateTabCounts() {
    const counts = {
        all:       allOrders.length,
        processing: allOrders.filter(o => o.tenTrangThai === 'Chờ xác nhận').length,
        shipping:   allOrders.filter(o => o.tenTrangThai === 'Đang giao').length,
        delivered:  allOrders.filter(o => o.tenTrangThai === 'Đã giao').length,
        cancelled:  allOrders.filter(o => o.tenTrangThai === 'Đã hủy').length
    };

    document.querySelectorAll('.tab-btn').forEach(btn => {
        const tab = btn.getAttribute('data-tab');
        const count = counts[tab] || 0;
        const badge = btn.querySelector('.tab-count');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-flex' : 'none';
        }
    });
}

// ─── Setup tab events ─────────────────────────────────────────────────────────
function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(t => {
                t.classList.remove('font-medium', 'text-primary', 'border-b-2', 'border-primary');
                t.classList.add('text-on-surface-variant');
            });
            tab.classList.add('font-medium', 'text-primary', 'border-b-2', 'border-primary');
            tab.classList.remove('text-on-surface-variant');

            renderOrders(tab.getAttribute('data-tab'));
        });
    });
}

// ─── Empty state ─────────────────────────────────────────────────────────────
function showEmpty(msg = 'Chưa có đơn hàng nào.') {
    document.getElementById('orders-container').innerHTML = `
        <div class="flex flex-col items-center py-20 text-center">
            <span class="material-symbols-outlined text-6xl text-on-surface-variant mb-4">shopping_bag</span>
            <p class="font-body-lg text-on-surface-variant mb-6">${msg}</p>
            <a href="sanpham.html"
               class="px-8 py-3 bg-primary text-white rounded font-label-caps uppercase hover:opacity-90 transition-opacity">
                Mua sắm ngay
            </a>
        </div>
    `;
}

// ─── Skeleton loading ─────────────────────────────────────────────────────────
function renderSkeleton() {
    return Array(3).fill(0).map(() => `
        <div class="animate-pulse bg-surface-container-lowest p-6 rounded-xl border border-surface-variant">
            <div class="flex justify-between mb-4">
                <div class="h-4 bg-surface-container rounded w-32"></div>
                <div class="h-6 bg-surface-container rounded w-24"></div>
            </div>
            <div class="h-4 bg-surface-container rounded w-48 mb-4"></div>
            <div class="flex justify-between pt-4 border-t border-outline-variant">
                <div class="h-6 bg-surface-container rounded w-32"></div>
                <div class="h-8 bg-surface-container rounded w-24"></div>
            </div>
        </div>
    `).join('');
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
    const existing = document.getElementById('toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = `fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg text-white text-sm font-medium
        ${type === 'error' ? 'bg-red-600' : 'bg-stone-800'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
