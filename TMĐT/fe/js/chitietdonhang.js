/**
 * chitietdonhang.js
 * Lấy chi tiết đơn hàng từ API và render lên trang chitietdonhang.html
 *
 * API:
 *   GET /api/orders/:id       - Chi tiết đơn hàng + sản phẩm
 *   GET /api/auth/me          - Thông tin user cho sidebar
 *   PUT /api/orders/:id/cancel - Hủy đơn hàng
 *
 * URL: chitietdonhang.html?id=1
 */

const API_URL = 'http://localhost:3005/api';

// Map trạng thái → bước timeline (0-based)
const STATUS_STEP = {
    'Chờ xác nhận': 0,
    'Đang giao':    2,
    'Đã giao':      3,
    'Đã hủy':       -1,
    'Chờ duyệt hoàn': -2,
    'Đã hoàn hàng': -3
};

// ─── Khởi động ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'dangnhap.html';
        return;
    }

    const params  = new URLSearchParams(window.location.search);
    const orderId = params.get('id');

    if (!orderId) {
        showError('Không tìm thấy mã đơn hàng.');
        return;
    }

    await Promise.all([loadUserInfo(), loadOrderDetail(orderId)]);
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
                joinEl.textContent = `Thành viên từ ${new Date(u.ngayTao).getFullYear()}`;
            }
        }
    } catch {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const nameEl = document.getElementById('user-name');
        if (nameEl && user.ten) nameEl.textContent = user.ten;
    }
}

// ─── Load chi tiết đơn hàng ───────────────────────────────────────────────────
async function loadOrderDetail(orderId) {
    const token = localStorage.getItem('token');
    try {
        const res  = await fetch(`${API_URL}/orders/${orderId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();

        if (!json.success) {
            showError(json.message || 'Không tìm thấy đơn hàng.');
            return;
        }

        renderOrderDetail(json.data);
    } catch (err) {
        console.error('loadOrderDetail error:', err);
        showError('Không thể kết nối server.');
    }
}

// ─── Render toàn bộ chi tiết ─────────────────────────────────────────────────
function renderOrderDetail(order) {
    const fmt = n => Number(n).toLocaleString('vi-VN') + ' ₫';

    // ── Breadcrumb & tiêu đề ──────────────────────────────────────────────
    document.getElementById('breadcrumb-id').textContent = `Chi tiết #${order.maDonHang}`;
    document.getElementById('page-title-id').textContent = `Chi tiết đơn hàng #${order.maDonHang}`;
    document.getElementById('page-date-id').textContent  =
        `Ngày đặt: ${formatDate(order.ngayDat)}`;

    // ── Nút hành động ────────────────────────────────────────────────────
    const btnCancel = document.getElementById('btn-cancel');
    const hasReturn = !!order.maYeuCauHoan;
    const isRejected = order.trangThaiHoan === 'Từ chối hoàn';

    if (btnCancel) {
        // Chỉ hiện hủy đơn khi đơn "Chờ xác nhận" VÀ không có yêu cầu hoàn (hoặc đã bị từ chối)
        if (order.tenTrangThai === 'Chờ xác nhận' && (!hasReturn || isRejected)) {
            btnCancel.style.display = 'flex';
            btnCancel.onclick = () => cancelOrder(order.maDonHang);
        } else {
            btnCancel.style.display = 'none';
        }
    }

    // ── Timeline ─────────────────────────────────────────────────────────
    renderTimeline(order);

    // ── Thông tin người nhận ─────────────────────────────────────────────
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('receiver-name').textContent  = user.ten || '—';
    document.getElementById('receiver-phone').textContent = user.soDienThoai || '—';
    document.getElementById('receiver-email').textContent = user.email || '—';

    // ── Địa chỉ giao hàng ────────────────────────────────────────────────
    document.getElementById('delivery-address').innerHTML =
        `${order.diaChiGiaoHang || '—'}
         ${order.loaiDiaChi ? `<br/><span class="text-xs text-on-surface-variant">(${order.loaiDiaChi})</span>` : ''}`;

    // ── Danh sách sản phẩm ───────────────────────────────────────────────
    const productContainer = document.getElementById('product-list-container');
    if (order.chiTiet && order.chiTiet.length > 0) {
        productContainer.innerHTML = order.chiTiet.map(item => {
            const imgSrc = item.hinhAnh
                ? `images/${item.hinhAnh}`
                : 'https://placehold.co/80x80/f0eee9/837562?text=No+Image';
            const giaFmt      = fmt(item.gia);
            const thanhTienFmt = fmt(item.thanhTien);

            return `
                <div class="p-6 flex gap-6">
                    <div class="w-20 h-20 bg-surface-container rounded-lg overflow-hidden flex-shrink-0 border border-outline-variant">
                        <img class="w-full h-full object-cover" src="${imgSrc}" alt="${item.tenSanPham}"
                             onerror="this.src='https://placehold.co/80x80/f0eee9/837562?text=No+Image'"/>
                    </div>
                    <div class="flex-grow flex flex-col md:flex-row justify-between gap-4">
                        <div>
                            <h4 class="font-title-sm text-on-surface">${item.tenSanPham}</h4>
                            <p class="font-body-md text-on-surface-variant mt-1">Mã SP: ${item.maSanPham}</p>
                            <p class="font-body-md text-on-surface mt-2">Số lượng: ${item.soLuong}</p>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <p class="font-headline-md text-primary text-lg font-semibold">${giaFmt}</p>
                            <p class="font-body-md text-on-surface-variant mt-1">Thành tiền: ${thanhTienFmt}</p>
                            ${order.tenTrangThai === 'Đã giao' ? `
                                <button onclick="window.location.href='danhgia.html?productId=${item.maSanPham}'" 
                                        class="mt-4 px-4 py-2 bg-primary/10 text-primary rounded-sm font-label-caps hover:bg-primary hover:text-white transition-all">
                                    Đánh giá sản phẩm
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        productContainer.innerHTML = `<p class="p-6 text-on-surface-variant">Không có sản phẩm.</p>`;
    }

    // ── Tóm tắt thanh toán ───────────────────────────────────────────────
    const tamTinh = order.tongTien - order.phiVanChuyen;
    document.getElementById('summary-subtotal').textContent = fmt(tamTinh);
    document.getElementById('summary-shipping').textContent = fmt(order.phiVanChuyen);
    document.getElementById('summary-total').textContent    = fmt(order.tongTien);

    // ── Phương thức thanh toán ───────────────────────────────────────────
    const ptttEl = document.getElementById('payment-method-name');
    if (ptttEl) ptttEl.textContent = order.phuongThucThanhToan || '—';

    // ── Đơn vị vận chuyển ────────────────────────────────────────────────
    const ptvcEl = document.getElementById('shipping-partner-name');
    if (ptvcEl) ptvcEl.textContent = order.phuongThucVanChuyen || '—';

    const ngayGiaoEl = document.getElementById('shipping-eta');
    if (ngayGiaoEl) {
        ngayGiaoEl.textContent = order.ngayDuKienGiao
            ? `Dự kiến: ${formatDate(order.ngayDuKienGiao)}`
            : '';
    }
}

// ─── Render timeline ─────────────────────────────────────────────────────────
function renderTimeline(order) {
    const container = document.getElementById('timeline-container');
    
    // Ưu tiên trạng thái hoàn nếu có
    const hasReturn = !!order.maYeuCauHoan;
    const returnStatus = order.trangThaiHoan;
    const isRejected = returnStatus === 'Từ chối hoàn';

    let step = STATUS_STEP[order.tenTrangThai] ?? 0;
    
    if (hasReturn && !isRejected) {
        if (returnStatus === 'Chờ duyệt hoàn') step = -2;
        else if (returnStatus === 'Đã duyệt hoàn') step = -3;
    }

    const ngayDat    = formatDate(order.ngayDat);
    const ngayXacNhan = order.ngayXacNhan ? formatDate(order.ngayXacNhan) : null;
    const ngayGiao   = order.ngayGiaoHang ? formatDate(order.ngayGiaoHang) : null;
    const ngayDuKien = order.ngayDuKienGiao ? formatDate(order.ngayDuKienGiao) : null;

    if (step === -1) {
        // Đã hủy
        const ngayHuy = order.ngayHuy ? formatDate(order.ngayHuy) : '';
        const gioHuy = order.ngayHuy ? new Date(order.ngayHuy).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
        
        container.innerHTML = `
            <div class="absolute top-5 left-10 right-10 h-0.5 bg-outline-variant"></div>
            <div class="relative z-10 flex flex-col items-center text-center w-1/2">
                <div class="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center lantern-glow mb-3 border-4 border-surface-container-lowest">
                    <span class="material-symbols-outlined text-sm">check</span>
                </div>
                <p class="font-title-sm text-sm text-on-surface">Đã đặt hàng</p>
                <p class="font-body-md text-xs text-on-surface-variant mt-1">${ngayDat}</p>
            </div>
            <div class="relative z-10 flex flex-col items-center text-center w-1/2">
                <div class="w-10 h-10 rounded-full bg-error-container text-error flex items-center justify-center mb-3 border-4 border-surface-container-lowest">
                    <span class="material-symbols-outlined text-sm">cancel</span>
                </div>
                <p class="font-title-sm text-sm text-error">Đã hủy đơn</p>
                <p class="font-body-md text-xs text-error mt-1">${gioHuy} ${ngayHuy}</p>
                ${order.lyDoHuy ? `<p class="font-body-md text-[11px] text-error mt-1 bg-error/5 px-2 py-1 rounded italic">Lý do: ${order.lyDoHuy}</p>` : ''}
            </div>
        `;
        return;
    }

    if (step === -2 || step === -3) {
        // Hoàn hàng
        const ngayHoan = order.ngayHoanThanh ? formatDate(order.ngayHoanThanh) : (order.ngayDat ? formatDate(order.ngayDat) : '');
        const label = step === -2 ? 'Đang xử lý hoàn' : 'Đã hoàn tiền';
        const icon = step === -2 ? 'pending' : 'keyboard_return';
        
        container.innerHTML = `
            <div class="absolute top-5 left-10 right-10 h-0.5 bg-outline-variant"></div>
            <div class="relative z-10 flex flex-col items-center text-center w-1/2">
                <div class="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center lantern-glow mb-3 border-4 border-surface-container-lowest">
                    <span class="material-symbols-outlined text-sm">check</span>
                </div>
                <p class="font-title-sm text-sm text-on-surface">Đã giao hàng</p>
                <p class="font-body-md text-xs text-on-surface-variant mt-1">${formatDate(order.ngayGiaoHang) || ngayDat}</p>
            </div>
            <div class="relative z-10 flex flex-col items-center text-center w-1/2">
                <div class="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-3 border-4 border-surface-container-lowest">
                    <span class="material-symbols-outlined text-sm">${icon}</span>
                </div>
                <p class="font-title-sm text-sm text-orange-600">${label}</p>
                <p class="font-body-md text-xs text-orange-600 mt-1">${ngayHoan}</p>
            </div>
        `;
        return;
    }

    const steps = [
        { icon: 'receipt',        label: 'Đã đặt hàng',   sub: ngayDat,                  done: step >= 0 },
        { icon: 'verified',       label: 'Đã xác nhận',   sub: ngayXacNhan || '—',        done: step >= 1 },
        { icon: 'local_shipping', label: 'Đang giao hàng', sub: ngayDuKien ? `Dự kiến ${ngayDuKien}` : '—', done: step >= 2 },
        { icon: 'inventory_2',    label: 'Hoàn tất',       sub: ngayGiao || '',            done: step >= 3 }
    ];

    container.innerHTML = `
        <div class="absolute top-5 left-10 right-10 h-0.5 bg-outline-variant"></div>
        ${steps.map(s => `
            <div class="relative z-10 flex flex-col items-center text-center w-1/4">
                <div class="w-10 h-10 rounded-full ${s.done ? 'bg-primary-container text-on-primary-container lantern-glow' : 'bg-surface-variant text-on-surface-variant'} flex items-center justify-center mb-3 border-4 border-surface-container-lowest">
                    <span class="material-symbols-outlined text-sm">${s.done ? 'check' : s.icon}</span>
                </div>
                <p class="font-title-sm text-sm ${s.done ? 'text-on-surface' : 'text-on-surface-variant'}">${s.label}</p>
                ${s.sub ? `<p class="font-body-md text-xs text-on-surface-variant mt-1">${s.sub}</p>` : ''}
            </div>
        `).join('')}
    `;
}

// ─── Hủy đơn hàng ────────────────────────────────────────────────────────────
function cancelOrder(maDonHang) {
    window.location.href = `huydon.html?id=${maDonHang}`;
}

// ─── Format ngày (tránh lệch timezone) ───────────────────────────────────────
function formatDate(dateStr) {
    if (!dateStr) return '—';
    const datePart = (dateStr + '').split('T')[0];
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
}

// ─── Hiển thị lỗi ────────────────────────────────────────────────────────────
function showError(msg) {
    document.querySelector('main').innerHTML = `
        <div class="flex flex-col items-center justify-center py-32 text-center w-full">
            <span class="material-symbols-outlined text-6xl text-on-surface-variant mb-4">error_outline</span>
            <h2 class="font-headline-md text-on-surface mb-2">Không tìm thấy đơn hàng</h2>
            <p class="text-on-surface-variant mb-6">${msg}</p>
            <a href="donhangcuatoi.html" class="bg-primary text-white px-6 py-3 rounded font-label-caps hover:opacity-90 transition-opacity">
                Quay lại đơn hàng của tôi
            </a>
        </div>
    `;
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
