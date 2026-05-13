/**
 * hoanhang.js
 * Trang yêu cầu hoàn trả hàng
 *
 * Luồng:
 *   1. Đọc ?id=<maDonHang> từ URL
 *   2. Gọi GET /api/orders/:id → hiển thị thông tin đơn hàng
 *   3. Khi submit → POST /api/returns với { maDonHang, lyDo }
 *   4. Thành công → redirect donhangcuatoi.html
 *
 * API:
 *   GET  /api/orders/:id
 *   POST /api/returns
 */

const API_URL = 'http://localhost:3005/api';

// Map value radio → text tiếng Việt
const REASON_MAP = {
    change_mind: 'Thay đổi ý định',
    cheaper:     'Tìm thấy giá rẻ hơn',
    defective:   'Sản phẩm lỗi',
    no_need:     'Không còn nhu cầu',
    other:       'Khác'
};

let orderData = null;

// ─── Khởi động ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'dangnhap.html';
        return;
    }

    const params    = new URLSearchParams(window.location.search);
    const orderId   = params.get('id');

    if (!orderId) {
        showError('Không tìm thấy mã đơn hàng. Vui lòng quay lại từ trang đơn hàng của tôi.');
        return;
    }

    await loadOrderInfo(orderId);
    setupForm(orderId);
});

// ─── Load thông tin đơn hàng ─────────────────────────────────────────────────
async function loadOrderInfo(orderId) {
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

        orderData = json.data;

        // Kiểm tra trạng thái — chỉ cho hoàn hàng khi "Đã giao"
        if (orderData.tenTrangThai !== 'Đã giao') {
            showError(`Chỉ có thể yêu cầu hoàn hàng khi đơn ở trạng thái "Đã giao".\nTrạng thái hiện tại: "${orderData.tenTrangThai}".`);
            return;
        }

        renderOrderInfo(orderData);
    } catch (err) {
        console.error('loadOrderInfo error:', err);
        showError('Không thể kết nối server.');
    }
}

// ─── Render thông tin đơn hàng ───────────────────────────────────────────────
function renderOrderInfo(order) {
    // Mã đơn
    document.getElementById('order-id').textContent = `Mã đơn hàng: #${order.maDonHang}`;

    // Tổng tiền
    document.getElementById('order-total').textContent =
        Number(order.tongTien).toLocaleString('vi-VN') + 'đ';

    // Danh sách sản phẩm
    const productContainer = document.getElementById('product-list');
    if (order.chiTiet && order.chiTiet.length > 0) {
        const first = order.chiTiet[0]; // Hiển thị sản phẩm đầu tiên trong card
        const imgSrc = first.hinhAnh
            ? `images/${first.hinhAnh}`
            : 'https://placehold.co/128x128/f0eee9/837562?text=No+Image';

        document.getElementById('product-img').src = imgSrc;
        document.getElementById('product-img').alt = first.tenSanPham;
        document.getElementById('product-name').textContent = first.tenSanPham;
        document.getElementById('product-qty').textContent  = `Số lượng: ${first.soLuong}`;
        document.getElementById('product-price').textContent =
            Number(first.gia).toLocaleString('vi-VN') + 'đ';

        // Nếu có nhiều sản phẩm → hiển thị thêm
        if (order.chiTiet.length > 1) {
            document.getElementById('product-more').textContent =
                `+ ${order.chiTiet.length - 1} sản phẩm khác`;
        }
    }

    // Địa chỉ giao hàng
    const addrEl = document.getElementById('order-address');
    if (addrEl) addrEl.textContent = order.diaChiGiaoHang || '—';
}

// ─── Setup form submit ────────────────────────────────────────────────────────
function setupForm(orderId) {
    const form    = document.getElementById('return-form');
    const btnSubmit = document.getElementById('btn-submit');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Lấy lý do đã chọn
        const selectedRadio = form.querySelector('input[name="reason"]:checked');
        const detailText    = document.getElementById('detail-reason').value.trim();

        if (!selectedRadio) {
            showToast('Vui lòng chọn lý do hoàn trả.', 'error');
            return;
        }

        // Ghép lý do: radio text + chi tiết (nếu có)
        let lyDo = REASON_MAP[selectedRadio.value] || selectedRadio.value;
        if (detailText) lyDo += `: ${detailText}`;

        // Loading
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Đang gửi...';

        const token = localStorage.getItem('token');
        try {
            const res  = await fetch(`${API_URL}/returns`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    maDonHang: parseInt(orderId),
                    lyDo
                })
            });
            const json = await res.json();

            if (json.success) {
                showToast('✓ ' + json.message, 'success');
                setTimeout(() => window.location.href = 'donhangcuatoi.html', 2000);
            } else {
                showToast(json.message || 'Gửi yêu cầu thất bại.', 'error');
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Xác nhận yêu cầu hoàn trả';
            }
        } catch (err) {
            console.error('submit return error:', err);
            showToast('Không thể kết nối server.', 'error');
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Xác nhận yêu cầu hoàn trả';
        }
    });
}

// ─── Hiển thị lỗi toàn trang ─────────────────────────────────────────────────
function showError(msg) {
    document.querySelector('main').innerHTML = `
        <div class="flex flex-col items-center justify-center py-32 text-center">
            <span class="material-symbols-outlined text-6xl text-on-surface-variant mb-4">error_outline</span>
            <h2 class="font-headline-md text-on-surface mb-2">Không thể thực hiện</h2>
            <p class="text-on-surface-variant mb-6 max-w-md">${msg}</p>
            <a href="donhangcuatoi.html"
               class="bg-primary text-white px-6 py-3 rounded font-label-caps hover:opacity-90 transition-opacity">
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
    toast.className = `fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg text-white text-sm font-medium max-w-sm text-center
        ${type === 'error' ? 'bg-red-600' : 'bg-stone-800'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}
