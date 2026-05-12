/**
 * dathang.js
 * Trang đặt hàng / thanh toán
 *
 * Luồng:
 *   1. Load giỏ hàng từ API → hiển thị tóm tắt đơn hàng
 *   2. Load thông tin user → điền sẵn form giao hàng
 *   3. Khi bấm "Đặt hàng":
 *      a. POST /api/orders  → tạo đơn hàng (lấy từ giỏ hàng)
 *      b. POST /api/payments/cod hoặc /api/payments/online → xác nhận thanh toán
 *      c. Redirect → donhangcuatoi.html
 *
 * API:
 *   GET  /api/cart
 *   POST /api/orders
 *   POST /api/payments/cod
 *   POST /api/payments/online
 *
 * maPTVC: 1 = Nhanh (15.000đ, 5 ngày), 2 = Hỏa tốc (30.000đ, 2 ngày)
 * maPTTT: 1 = MOMO, 2 = COD
 */

const API_URL = 'http://localhost:3005/api';

// Phí vận chuyển theo maPTVC
const SHIPPING = {
    1: { ten: 'Giao hàng tiêu chuẩn', phi: 15000, ngay: '3-5 ngày' },
    2: { ten: 'Giao hàng hỏa tốc',    phi: 30000, ngay: '1-2 ngày' }
};

// Phương thức thanh toán
const PAYMENT = {
    cod:  { maPTTT: 2, ten: 'COD' },
    momo: { maPTTT: 1, ten: 'MOMO' }
};

let cartData = null;
let selectedVC = 1; // 1: Nhanh, 2: Hỏa tốc
let selectedTT = 'cod'; // 'cod' hoặc 'momo'
let reorderItems = null; // Danh sách sản phẩm nếu là mua lại

// ─── Khởi động ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Chưa đăng nhập', 'Vui lòng đăng nhập để đặt hàng.', 'error');
        setTimeout(() => window.location.href = 'dangnhap.html', 1500);
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const reorderId = params.get('reorderId');

    // Nếu là mua lại, tải thông tin đơn cũ trước
    if (reorderId) {
        await loadOldOrderInfo(reorderId);
        // Sau đó vẫn loadUserInfo để lấy tên/sdt/email
        await loadUserInfo();
    } else {
        // Bình thường thì load giỏ hàng và userInfo
        await Promise.all([loadCart(), loadUserInfo()]);
    }

    setupShippingEvents();
    setupPaymentEvents();
});

// ─── Load thông tin đơn hàng cũ để điền lại ─────────────────────────────────
async function loadOldOrderInfo(id) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/orders/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) {
            const order = json.data;
            reorderItems = order.chiTiet; // Lưu lại để dùng khi checkout
            
            // Điền địa chỉ
            if (order.diaChiGiaoHang) {
                document.getElementById('input-diachi').value = order.diaChiGiaoHang;
            }

            // Chọn loại địa chỉ
            if (order.loaiDiaChi) {
                const radio = document.querySelector(`input[name="loai-diachi"][value="${order.loaiDiaChi}"]`);
                if (radio) radio.checked = true;
            }

            // Chọn PTVC
            if (order.maPTVC) {
                selectedVC = order.maPTVC;
                const radio = document.querySelector(`input[name="shipping"][value="${selectedVC}"]`);
                if (radio) radio.checked = true;
                updatePriceSummary();
            }

            // Chọn PTTT
            if (order.maPTTT) {
                selectedTT = order.maPTTT === 1 ? 'momo' : 'cod';
                const radio = document.querySelector(`input[name="payment"][value="${selectedTT}"]`);
                if (radio) radio.checked = true;
            }

            // Render danh sách sản phẩm từ đơn cũ thay vì giỏ hàng
            renderCartFromData({
                items: order.chiTiet,
                tongTien: order.chiTiet.reduce((sum, i) => sum + i.thanhTien, 0)
            });
        }
    } catch (err) {
        console.error('loadOldOrderInfo error:', err);
    }
}

// Hàm render dùng chung cho cả giỏ hàng và mua lại
function renderCartFromData(data) {
    cartData = data;
    const container = document.getElementById('order-items');
    if (!container) return;

    if (!data.items || data.items.length === 0) {
        container.innerHTML = '<p class="text-on-surface-variant italic">Không có sản phẩm.</p>';
        return;
    }

    container.innerHTML = data.items.map(item => {
        const imgSrc = item.hinhAnh
            ? `images/${item.hinhAnh}`
            : 'https://placehold.co/80x96/f0eee9/837562?text=No+Image';
        const giaFmt      = Number(item.gia).toLocaleString('vi-VN') + '₫';
        const thanhTienFmt = Number(item.gia * item.soLuong).toLocaleString('vi-VN') + '₫';

        return `
            <div class="flex gap-stack-md items-start">
                <div class="relative w-20 h-24 bg-surface-container-highest rounded overflow-hidden flex-shrink-0">
                    <img src="${imgSrc}" alt="${item.tenSanPham}"
                         class="w-full h-full object-cover"
                         onerror="this.src='https://placehold.co/80x96/f0eee9/837562?text=No+Image'"/>
                    <span class="absolute top-0 right-0 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-bl font-bold">
                        x${item.soLuong}
                    </span>
                </div>
                <div class="flex-grow min-w-0">
                    <h3 class="font-body-lg text-body-lg font-medium text-on-surface leading-snug mb-1 truncate">${item.tenSanPham}</h3>
                    <p class="text-body-md text-outline">Đơn giá: ${giaFmt}</p>
                    <p class="text-body-md text-outline">Số lượng: ${item.soLuong}</p>
                    <p class="text-body-lg font-semibold text-secondary mt-1">${thanhTienFmt}</p>
                </div>
            </div>
        `;
    }).join('');

    updatePriceSummary();
}

// ─── Load giỏ hàng ───────────────────────────────────────────────────────────
async function loadCart() {
    const token = localStorage.getItem('token');
    try {
        const res  = await fetch(`${API_URL}/cart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();

        if (!json.success || json.data.items.length === 0) {
            showNotification('Giỏ hàng trống', 'Vui lòng thêm sản phẩm trước khi đặt hàng.', 'error');
            setTimeout(() => window.location.href = 'sanpham.html', 1500);
            return;
        }

        cartData = json.data;
        renderOrderSummary();
    } catch (err) {
        console.error('loadCart error:', err);
        showNotification('Lỗi kết nối', 'Không thể tải giỏ hàng.', 'error');
    }
}

// ─── Load thông tin user để điền sẵn form ────────────────────────────────────
async function loadUserInfo() {
    const token = localStorage.getItem('token');

    try {
        const res  = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();

        if (json.success) {
            const u = json.data;
            if (u.ten)         document.getElementById('input-ten').value   = u.ten;
            if (u.email)       document.getElementById('input-email').value = u.email;
            if (u.soDienThoai) document.getElementById('input-sdt').value   = u.soDienThoai;
            if (u.diaChi)      document.getElementById('input-diachi').value = u.diaChi;

            // Cập nhật localStorage với thông tin mới nhất
            localStorage.setItem('user', JSON.stringify({
                id:          u.id,
                ten:         u.ten,
                email:       u.email,
                soDienThoai: u.soDienThoai,
                role:        u.vaiTro
            }));
        }
    } catch (err) {
        // Fallback: đọc từ localStorage nếu API lỗi
        console.warn('loadUserInfo fallback to localStorage:', err.message);
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.ten)         document.getElementById('input-ten').value   = user.ten;
        if (user.email)       document.getElementById('input-email').value = user.email;
        if (user.soDienThoai) document.getElementById('input-sdt').value   = user.soDienThoai;
    }
}

// ─── Render tóm tắt đơn hàng ─────────────────────────────────────────────────
function renderOrderSummary() {
    if (!cartData) return;

    const { items } = cartData;
    const container = document.getElementById('order-items');

    container.innerHTML = items.map(item => {
        const imgSrc = item.hinhAnh
            ? `images/${item.hinhAnh}`
            : 'https://placehold.co/80x96/f0eee9/837562?text=No+Image';
        const giaFmt      = Number(item.gia).toLocaleString('vi-VN') + '₫';
        const thanhTienFmt = Number(item.thanhTien).toLocaleString('vi-VN') + '₫';

        return `
            <div class="flex gap-stack-md items-start">
                <div class="relative w-20 h-24 bg-surface-container-highest rounded overflow-hidden flex-shrink-0">
                    <img src="${imgSrc}" alt="${item.tenSanPham}"
                         class="w-full h-full object-cover"
                         onerror="this.src='https://placehold.co/80x96/f0eee9/837562?text=No+Image'"/>
                    <span class="absolute top-0 right-0 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-bl font-bold">
                        x${item.soLuong}
                    </span>
                </div>
                <div class="flex-grow min-w-0">
                    <h3 class="font-body-lg text-body-lg font-medium text-on-surface leading-snug mb-1 truncate">${item.tenSanPham}</h3>
                    <p class="text-body-md text-outline">Đơn giá: ${giaFmt}</p>
                    <p class="text-body-md text-outline">Số lượng: ${item.soLuong}</p>
                    <p class="text-body-lg font-semibold text-secondary mt-1">${thanhTienFmt}</p>
                </div>
            </div>
        `;
    }).join('');

    updatePriceSummary();
}

// ─── Cập nhật bảng giá ───────────────────────────────────────────────────────
function updatePriceSummary() {
    if (!cartData) return;

    const { items, tongTien } = cartData;
    const phiVC    = SHIPPING[selectedVC].phi;
    const soNgay   = SHIPPING[selectedVC].ngay;
    const tongCong = tongTien + phiVC;

    // Tổng số lượng sản phẩm
    const tongSoLuong = items.reduce((sum, i) => sum + i.soLuong, 0);

    // Ngày dự kiến giao
    const ngayGiao = new Date();
    const soNgayMax = parseInt(soNgay.split('-')[1] || soNgay);
    ngayGiao.setDate(ngayGiao.getDate() + soNgayMax);
    const ngayGiaoFmt = ngayGiao.toLocaleDateString('vi-VN', {
        weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
    });

    const fmt = n => Number(n).toLocaleString('vi-VN') + '₫';

    document.getElementById('price-so-luong').textContent  = `${tongSoLuong} sản phẩm`;
    document.getElementById('price-tam-tinh').textContent  = fmt(tongTien);
    document.getElementById('price-phi-vc').textContent    = fmt(phiVC);
    document.getElementById('price-ngay-giao').textContent = ngayGiaoFmt;
    document.getElementById('price-tong-cong').textContent = fmt(tongCong);
}

// ─── Sự kiện chọn vận chuyển ─────────────────────────────────────────────────
function setupShippingEvents() {
    document.querySelectorAll('input[name="shipping"]').forEach(radio => {
        radio.addEventListener('change', () => {
            selectedVC = parseInt(radio.value);
            updatePriceSummary();
        });
    });
}

// ─── Sự kiện chọn thanh toán ─────────────────────────────────────────────────
function setupPaymentEvents() {
    document.querySelectorAll('input[name="payment"]').forEach(radio => {
        radio.addEventListener('change', () => {
            selectedTT = radio.value;
        });
    });
}

// ─── Xử lý đặt hàng ──────────────────────────────────────────────────────────
async function handleCheckout() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'dangnhap.html';
        return;
    }

    // Validate form
    const ten      = document.getElementById('input-ten').value.trim();
    const sdt      = document.getElementById('input-sdt').value.trim();
    const diaChi   = document.getElementById('input-diachi').value.trim();
    const loaiDiaChi = document.querySelector('input[name="loai-diachi"]:checked')?.value || 'Nhà';

    if (!ten)    { showNotification('Thiếu thông tin', 'Vui lòng nhập họ và tên.', 'error'); return; }
    if (!sdt)    { showNotification('Thiếu thông tin', 'Vui lòng nhập số điện thoại.', 'error'); return; }
    if (!diaChi) { showNotification('Thiếu thông tin', 'Vui lòng nhập địa chỉ nhận hàng.', 'error'); return; }

    const btn = document.getElementById('btn-checkout');
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin">progress_activity</span> Đang xử lý...`;

    try {
        // ── Bước 1: Tạo đơn hàng ──────────────────────────────────────────
        const body = {
            diaChiGiaoHang: diaChi,
            loaiDiaChi:     loaiDiaChi,
            maPTTT:         PAYMENT[selectedTT].maPTTT,
            maPTVC:         selectedVC
        };

        // Nếu là mua lại (reorderItems), gửi kèm danh sách items thay vì để backend lấy từ giỏ
        if (reorderItems) {
            body.items = reorderItems.map(i => ({
                maSanPham: i.maSanPham,
                soLuong: i.soLuong
            }));
        }

        const orderRes = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });
        const orderJson = await orderRes.json();

        if (!orderJson.success) {
            showNotification('Đặt hàng thất bại', orderJson.message, 'error');
            resetBtn(btn);
            return;
        }

        const maDonHang = orderJson.data.maDonHang;

        // ── Bước 2: Xác nhận thanh toán ───────────────────────────────────
        let paymentEndpoint = selectedTT === 'cod'
            ? `${API_URL}/payments/cod`
            : `${API_URL}/payments/online`;

        const payRes = await fetch(paymentEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                maDonHang,
                momoCode: selectedTT !== 'cod' ? `MOCK_${Date.now()}` : undefined
            })
        });
        const payJson = await payRes.json();

        if (!payJson.success) {
            showNotification('Thanh toán thất bại', payJson.message, 'error');
            resetBtn(btn);
            return;
        }

        // ── Bước 3: Thành công → redirect ─────────────────────────────────
        const tongCong = (cartData?.tongTien || 0) + SHIPPING[selectedVC].phi;
        
        if (selectedTT === 'cod') {
            showNotification(
                `Đặt hàng thành công! 🎉`,
                `Mã đơn #${maDonHang} · ${Number(tongCong).toLocaleString('vi-VN')}₫ · Đang xử lý`,
                'success'
            );
        }
        
        setTimeout(() => {
            if (selectedTT === 'momo') {
                window.location.href = `mathanhtoan.html?id=${maDonHang}`;
            } else {
                window.location.href = 'donhangcuatoi.html';
            }
        }, selectedTT === 'momo' ? 500 : 2500);

    } catch (err) {
        console.error('handleCheckout error:', err);
        showNotification('Lỗi kết nối', 'Không thể kết nối server. Vui lòng thử lại.', 'error');
        resetBtn(btn);
    }
}

function resetBtn(btn) {
    btn.disabled = false;
    btn.innerHTML = `<span class="material-symbols-outlined">lock</span> Đặt hàng ngay`;
}

// ─── Toast thông báo ─────────────────────────────────────────────────────────
function showNotification(title, message, type = 'error') {
    const toast   = document.getElementById('notification-toast');
    const icon    = document.getElementById('notif-icon');
    const titleEl = document.getElementById('notif-title');
    const msgEl   = document.getElementById('notif-message');

    titleEl.textContent = title;
    msgEl.textContent   = message;

    if (type === 'success') {
        toast.style.borderLeftColor = '#3d8c40';
        icon.textContent            = 'check_circle';
        icon.style.color            = '#3d8c40';
    } else {
        toast.style.borderLeftColor = '#b52424';
        icon.textContent            = 'error';
        icon.style.color            = '#b52424';
    }

    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}
