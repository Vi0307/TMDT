/**
 * donhangcuatoi.js
 * Lấy danh sách đơn hàng từ API và render lên trang donhangcuatoi.html
 *
 * API:
 *   GET /api/orders/my-orders?limit=50
 *   GET /api/returns/my-returns?limit=50
 *   GET /api/auth/me
 *   PUT /api/orders/:id/cancel
 */

const API_URL = 'http://localhost:3005/api';

// Badge config theo trạng thái
const STATUS_BADGE = {
    'Chờ xác nhận': { label: 'ĐANG XỬ LÝ',    cls: 'bg-surface-variant text-on-surface' },
    'Đang giao':    { label: 'ĐANG GIAO HÀNG', cls: 'bg-primary-container/20 text-primary' },
    'Đã giao':      { label: 'ĐÃ GIAO HÀNG',   cls: 'bg-green-100 text-green-800' },
    'Đã hủy':       { label: 'ĐÃ HỦY',         cls: 'bg-error-container/20 text-error' }
};

// Badge trạng thái yêu cầu hoàn hàng
const RETURN_BADGE = {
    'Chờ duyệt hoàn': { label: 'CHỜ DUYỆT HOÀN', cls: 'bg-amber-100 text-amber-800' },
    'Đã duyệt hoàn':  { label: 'ĐÃ HOÀN HÀNG',   cls: 'bg-green-100 text-green-800' },
    'Từ chối hoàn':   { label: 'TỪ CHỐI HOÀN',    cls: 'bg-error-container/20 text-error' }
};

let currentTab = 'all';
let allOrders  = [];   // cache đơn hàng
let returnMap  = {};   // { maDonHang: trangThaiHoan } — đơn nào đã có yêu cầu hoàn

// ─── Khởi động ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'dangnhap.html';
        return;
    }

    await Promise.all([loadUserInfo(), loadOrders()]);
    
    setupTabs();

    // Xử lý tab từ URL (ví dụ ?tab=cancelled)
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
        const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabParam}"]`);
        if (tabBtn) {
            switchTab(tabBtn);
        }
    }
});

// Hàm hỗ trợ đổi tab
function switchTab(tabBtn) {
    document.querySelectorAll('.tab-btn').forEach(t => {
        t.classList.remove('font-medium', 'text-primary', 'border-b-2', 'border-primary');
        t.classList.add('text-on-surface-variant');
    });
    tabBtn.classList.add('font-medium', 'text-primary', 'border-b-2', 'border-primary');
    tabBtn.classList.remove('text-on-surface-variant');
    renderOrders(tabBtn.getAttribute('data-tab'));
}

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
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const nameEl = document.getElementById('user-name');
        if (nameEl && user.ten) nameEl.textContent = user.ten;
    }
}

// ─── Load đơn hàng + yêu cầu hoàn hàng ──────────────────────────────────────
async function loadOrders() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('orders-container');
    container.innerHTML = renderSkeleton();

    try {
        // Gọi song song 2 API
        const [ordersRes, returnsRes] = await Promise.all([
            fetch(`${API_URL}/orders/my-orders?limit=50`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_URL}/returns/my-returns?limit=50`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        const ordersJson  = await ordersRes.json();
        const returnsJson = await returnsRes.json();

        if (!ordersJson.success) {
            showEmpty('Không thể tải đơn hàng. Vui lòng thử lại.');
            return;
        }

        allOrders = ordersJson.data;

        // Build map: maDonHang → trangThaiHoan
        returnMap = {};
        if (returnsJson.success && returnsJson.data) {
            returnsJson.data.forEach(r => {
                returnMap[r.maDonHang] = r.trangThai; // 'Chờ duyệt hoàn' | 'Đã duyệt hoàn' | 'Từ chối hoàn'
            });
        }

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

    const filtered = allOrders.filter(o => {
        const hasReturn    = !!returnMap[o.maDonHang];
        const returnStatus = returnMap[o.maDonHang];

        if (tab === 'all')        return true;
        
        // Trạng thái đơn hàng gốc
        const isProcessing = o.tenTrangThai === 'Chờ xác nhận';
        const isShipping   = o.tenTrangThai === 'Đang giao';
        const isDelivered  = o.tenTrangThai === 'Đã giao';
        const isCancelled  = o.tenTrangThai === 'Đã hủy';

        // Nếu có yêu cầu hoàn (và không bị từ chối) -> ƯU TIÊN hiện ở tab Hoàn và hủy
        const showInReturnTab = hasReturn && returnStatus !== 'Từ chối hoàn';

        if (tab === 'processing') return isProcessing && !showInReturnTab;
        if (tab === 'shipping')   return isShipping && !showInReturnTab;
        
        // Tab "Đã giao": hiện đơn đã giao mà (CHƯA có yêu cầu hoàn HOẶC yêu cầu bị từ chối)
        if (tab === 'delivered') {
            return isDelivered && (!hasReturn || returnStatus === 'Từ chối hoàn');
        }
        
        // Tab "Hoàn và hủy": đơn đã hủy HOẶC đơn có yêu cầu hoàn (mà CHƯA bị từ chối)
        if (tab === 'cancelled') {
            return isCancelled || showInReturnTab;
        }
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
    const datePart = (dateStr + '').split('T')[0];
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
}

function renderOrderCard(order) {
    const hasReturn    = !!returnMap[order.maDonHang];
    const returnStatus = returnMap[order.maDonHang];

    // Badge: nếu có yêu cầu hoàn thì dùng badge hoàn, không thì dùng badge đơn hàng
    let badge;
    if (hasReturn && RETURN_BADGE[returnStatus]) {
        badge = RETURN_BADGE[returnStatus];
    } else {
        badge = STATUS_BADGE[order.tenTrangThai] || { label: order.tenTrangThai, cls: 'bg-surface-variant text-on-surface' };
    }

    const tongFmt = Number(order.tongTien).toLocaleString('vi-VN') + ' ₫';
    const ngayDat = formatDate(order.ngayDat);

    // Nút hành động
    let actions = '';
    if (order.tenTrangThai === 'Chờ xác nhận' && !hasReturn) {
        actions = `
            <button onclick="cancelOrder(${order.maDonHang})"
                class="flex-1 md:flex-none px-6 py-2 border border-outline text-on-surface font-label-caps rounded hover:bg-surface-variant transition-colors">
                HỦY ĐƠN
            </button>`;
    } else if (order.tenTrangThai === 'Đang giao' && !hasReturn) {
        actions = `
            <button class="flex-1 md:flex-none px-6 py-2 border border-outline text-on-surface font-label-caps rounded hover:bg-surface-variant transition-colors">
                LIÊN HỆ ĐVVC
            </button>`;
    } else if (order.tenTrangThai === 'Đã giao' && !hasReturn) {
        // Chưa có yêu cầu hoàn → cho phép trả hàng và đánh giá
        actions = `
            <button onclick="window.location.href='hoanhang.html?id=${order.maDonHang}&fromTab=${currentTab}'"
                class="flex-1 md:flex-none px-6 py-2 border border-error text-error font-label-caps rounded hover:bg-error-container/20 transition-colors">
                TRẢ HÀNG / HOÀN TIỀN
            </button>
            <button onclick="evaluateOrder(${order.maDonHang}, event)"
                class="flex-1 md:flex-none px-6 py-2 border border-outline text-on-surface font-label-caps rounded hover:bg-surface-variant transition-colors">
                ĐÁNH GIÁ
            </button>`;
    } else if (order.tenTrangThai === 'Đã giao' && hasReturn) {
        // Đã có yêu cầu hoàn → chỉ hiện trạng thái, không cho trả lại
        actions = `
            <span class="flex-1 md:flex-none px-4 py-2 text-xs text-on-surface-variant italic">
                Yêu cầu hoàn: ${returnStatus}
            </span>`;
    } else if (order.tenTrangThai === 'Đã hủy') {
        actions = `
            <button onclick="buyAgain(${order.maDonHang}, event)"
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
            <div class="flex flex-col md:flex-row justify-between md:items-center border-b border-outline-variant pb-4 mb-4 gap-4">
                <div>
                    <a href="chitietdonhang.html?id=${order.maDonHang}&fromTab=${currentTab}"
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

            <div class="flex items-center gap-3 mb-4">
                <span class="material-symbols-outlined text-on-surface-variant">inventory_2</span>
                <span class="font-body-md text-on-surface-variant">
                    ${order.soLuongSanPham} sản phẩm
                    · ${order.phuongThucThanhToan || '—'}
                </span>
            </div>

            <div class="border-t border-outline-variant pt-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div class="font-body-md text-on-surface-variant w-full md:w-auto text-right md:text-left">
                    Tổng cộng:
                    <span class="font-headline-md text-error font-semibold ml-2">${tongFmt}</span>
                </div>
                <div class="flex flex-wrap gap-3 w-full md:w-auto justify-end">
                    ${actions}
                    <a href="chitietdonhang.html?id=${order.maDonHang}&fromTab=${currentTab}"
                       class="text-center flex-1 md:flex-none px-6 py-2 bg-secondary text-on-secondary font-label-caps rounded shadow hover:opacity-90 transition-opacity block">
                        CHI TIẾT
                    </a>
                </div>
            </div>
        </div>
    `;
}

// ─── Hủy đơn hàng ────────────────────────────────────────────────────────────
function cancelOrder(maDonHang) {
    window.location.href = `huydon.html?id=${maDonHang}&fromTab=${currentTab}`;
}

// ─── Mua lại đơn hàng ────────────────────────────────────────────────────────
async function buyAgain(maDonHang, event) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'dangnhap.html';
        return;
    }

    const btn = event ? event.target : null;
    let originalText = '';
    if (btn) {
        originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-[12px] align-middle mr-1">progress_activity</span> Đang mua lại...`;
    }

    try {
        // 1. Lấy thông tin chi tiết đơn hàng cũ để lấy danh sách sản phẩm
        const res = await fetch(`${API_URL}/orders/${maDonHang}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();

        if (!json.success || !json.data || !json.data.chiTiet) {
            showToast('Không thể lấy chi tiết đơn hàng cũ', 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
            return;
        }

        const items = json.data.chiTiet;
        if (items.length === 0) {
            showToast('Đơn hàng không có sản phẩm nào', 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
            return;
        }

        // 2. Thêm từng sản phẩm vào giỏ hàng
        const addPromises = items.map(item => 
            fetch(`${API_URL}/cart`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ maSanPham: item.maSanPham, soLuong: item.soLuong })
            }).then(r => r.json())
        );

        const results = await Promise.all(addPromises);
        const allSuccess = results.every(resJson => resJson.success);

        if (allSuccess) {
            showToast('Đã thêm sản phẩm vào giỏ hàng');
            if (window.updateCartCount) window.updateCartCount();
            setTimeout(() => {
                window.location.href = 'dathang.html';
            }, 800);
        } else {
            showToast('Có lỗi xảy ra khi thêm sản phẩm vào giỏ hàng', 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }

    } catch (err) {
        console.error('buyAgain error:', err);
        showToast('Không thể kết nối server', 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}

// ─── Đánh giá đơn hàng ───────────────────────────────────────────────────────
async function evaluateOrder(maDonHang, event) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'dangnhap.html';
        return;
    }

    const btn = event ? event.target : null;
    let originalText = '';
    if (btn) {
        originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-[12px] align-middle mr-1">progress_activity</span> Đang tải...`;
    }

    try {
        const res = await fetch(`${API_URL}/orders/${maDonHang}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();

        if (json.success && json.data && json.data.chiTiet && json.data.chiTiet.length > 0) {
            const firstProduct = json.data.chiTiet[0];
            window.location.href = `danhgia.html?productId=${firstProduct.maSanPham}`;
        } else {
            showToast('Không tìm thấy sản phẩm trong đơn hàng để đánh giá', 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
    } catch (err) {
        console.error('evaluateOrder error:', err);
        showToast('Không thể kết nối server', 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}

// ─── Cập nhật số lượng đơn trên tab ──────────────────────────────────────────
function updateTabCounts() {
    const counts = {
        all: allOrders.length,
        processing: allOrders.filter(o => 
            o.tenTrangThai === 'Chờ xác nhận' && !(!!returnMap[o.maDonHang] && returnMap[o.maDonHang] !== 'Từ chối hoàn')
        ).length,
        shipping: allOrders.filter(o => 
            o.tenTrangThai === 'Đang giao' && !(!!returnMap[o.maDonHang] && returnMap[o.maDonHang] !== 'Từ chối hoàn')
        ).length,
        // Đã giao: (Đã giao) VÀ (không có hoàn HOẶC hoàn bị từ chối)
        delivered: allOrders.filter(o => 
            o.tenTrangThai === 'Đã giao' && (!returnMap[o.maDonHang] || returnMap[o.maDonHang] === 'Từ chối hoàn')
        ).length,
        // Hoàn và hủy: (Đã hủy) HOẶC (có hoàn và không bị từ chối)
        cancelled: allOrders.filter(o => 
            o.tenTrangThai === 'Đã hủy' || (!!returnMap[o.maDonHang] && returnMap[o.maDonHang] !== 'Từ chối hoàn')
        ).length
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
            switchTab(tab);
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
