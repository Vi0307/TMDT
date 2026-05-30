/**
 * giohang.js
 * Lấy giỏ hàng từ API và render lên trang giohang.html
 *
 * API:
 *   GET    /api/cart        - Lấy giỏ hàng
 *   PUT    /api/cart/:id    - Cập nhật số lượng (maCTGH)
 *   DELETE /api/cart/:id    - Xóa 1 item
 */

const API_URL = 'http://localhost:3005/api';

// ─── Khởi động ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        showLoginPrompt();
        return;
    }
    loadCart();
});

// ─── Lấy giỏ hàng từ API ─────────────────────────────────────────────────────
async function loadCart() {
    const token = localStorage.getItem('token');
    showSkeleton();

    try {
        const res = await fetch(`${API_URL}/cart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();

        if (!json.success) {
            showError(json.message);
            return;
        }

        renderCart(json.data);
    } catch (err) {
        console.error('loadCart error:', err);
        showError('Không thể kết nối server.');
    }
}

// ─── Render toàn bộ giỏ hàng ─────────────────────────────────────────────────
function renderCart(data) {
    const { items, tongTien } = data;
    const tbody = document.getElementById('cart-tbody');
    const emptyState = document.getElementById('cart-empty');
    const cartTable = document.getElementById('cart-table');
    const summarySection = document.getElementById('cart-summary');

    if (items.length === 0) {
        cartTable.classList.add('hidden');
        summarySection.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    cartTable.classList.remove('hidden');
    summarySection.classList.remove('hidden');
    emptyState.classList.add('hidden');

    tbody.innerHTML = items.map(item => renderCartRow(item)).join('');
    updateSummary(items);
}

// ─── Render 1 dòng sản phẩm ──────────────────────────────────────────────────
function renderCartRow(item) {
    const imgSrc = item.hinhAnh
        ? (item.hinhAnh.startsWith('http://') || item.hinhAnh.startsWith('https://') || item.hinhAnh.startsWith('data:') ? item.hinhAnh : `images/${item.hinhAnh}`)
        : 'https://placehold.co/96x96/f0eee9/837562?text=No+Image';

    const giaFmt    = Number(item.gia).toLocaleString('vi-VN') + '₫';
    const thanhTien = Number(item.thanhTien).toLocaleString('vi-VN') + '₫';

    return `
        <tr id="row-${item.maCTGH}" class="group hover:bg-surface-container-lowest transition-colors">
            <td class="px-6 py-8">
                <div class="flex items-center gap-6">
                    <img class="w-24 h-24 object-cover rounded shadow-sm border border-outline-variant/10"
                         src="${imgSrc}" alt="${item.tenSanPham}"
                         onerror="this.src='https://placehold.co/96x96/f0eee9/837562?text=No+Image'"/>
                    <div>
                        <h3 class="font-title-sm text-title-sm text-on-surface mb-1">${item.tenSanPham}</h3>
                        <p class="font-body-md text-on-surface-variant text-sm">Mã: ${item.maSanPham}</p>
                        <button onclick="removeItem(${item.maCTGH})"
                            class="mt-2 text-secondary text-[12px] font-semibold flex items-center gap-1 hover:underline">
                            <span class="material-symbols-outlined text-[14px]">delete</span> Loại bỏ
                        </button>
                    </div>
                </div>
            </td>
            <td class="px-6 py-8 text-center font-body-lg text-on-surface">${giaFmt}</td>
            <td class="px-6 py-8">
                <div class="flex items-center justify-center border border-outline-variant/40 rounded-lg w-fit mx-auto overflow-hidden">
                    <button onclick="changeQty(${item.maCTGH}, ${item.soLuong - 1}, ${item.soLuongTon})"
                        class="px-3 py-1 hover:bg-surface-container transition-colors">
                        <span class="material-symbols-outlined text-[18px]">remove</span>
                    </button>
                    <span id="qty-${item.maCTGH}" class="px-4 py-1 font-body-lg border-x border-outline-variant/20 min-w-[40px] text-center">
                        ${item.soLuong}
                    </span>
                    <button onclick="changeQty(${item.maCTGH}, ${item.soLuong + 1}, ${item.soLuongTon})"
                        class="px-3 py-1 hover:bg-surface-container transition-colors">
                        <span class="material-symbols-outlined text-[18px]">add</span>
                    </button>
                </div>
            </td>
            <td id="thanhtien-${item.maCTGH}" class="px-6 py-8 text-right font-title-sm text-on-surface font-semibold">
                ${thanhTien}
            </td>
        </tr>
    `;
}

// ─── Cập nhật số lượng ───────────────────────────────────────────────────────
async function changeQty(maCTGH, newQty, maxQty) {
    if (newQty < 1) {
        // Xóa item nếu giảm xuống 0
        removeItem(maCTGH);
        return;
    }
    if (newQty > maxQty) {
        showToast(`Chỉ còn ${maxQty} sản phẩm trong kho`, 'error');
        return;
    }

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/cart/${maCTGH}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ soLuong: newQty })
        });
        const json = await res.json();
        if (json.success) {
            // Cập nhật số lượng hiển thị
            const qtyEl = document.getElementById(`qty-${maCTGH}`);
            if (qtyEl) qtyEl.textContent = newQty;

            // Cập nhật giá trị nút cộng/trừ (để lần bấm sau đúng giá trị)
            const row = document.getElementById(`row-${maCTGH}`);
            if (row) {
                const buttons = row.querySelectorAll('button[onclick^="changeQty"]');
                buttons[0].setAttribute('onclick', `changeQty(${maCTGH}, ${newQty - 1}, ${maxQty})`);
                buttons[1].setAttribute('onclick', `changeQty(${maCTGH}, ${newQty + 1}, ${maxQty})`);
                
                // Cập nhật thành tiền của dòng
                const price = parseFloat(row.querySelector('td:nth-child(2)').textContent.replace(/[^\d]/g, ''));
                const thanhTienEl = document.getElementById(`thanhtien-${maCTGH}`);
                if (thanhTienEl) {
                    thanhTienEl.textContent = Number(price * newQty).toLocaleString('vi-VN') + '₫';
                }
            }

            // Cập nhật tổng kết toàn cục (fetch lại thầm lặng hoặc tính toán lại)
            updateGlobalSummaryLocally();
            if (window.updateCartCount) window.updateCartCount();
        } else {
            showToast(json.message, 'error');
        }
    } catch {
        showToast('Không thể kết nối server', 'error');
    }
}

function updateGlobalSummaryLocally() {
    let tamTinh = 0;
    let totalItems = 0;
    
    document.querySelectorAll('[id^="thanhtien-"]').forEach(el => {
        const val = parseFloat(el.textContent.replace(/[^\d]/g, ''));
        tamTinh += val;
    });

    document.querySelectorAll('[id^="qty-"]').forEach(el => {
        totalItems += parseInt(el.textContent.trim());
    });

    const phiVC = tamTinh > 0 ? 15000 : 0;
    const tongCong = tamTinh + phiVC;
    const fmt = (n) => Number(n).toLocaleString('vi-VN') + '₫';

    document.getElementById('tam-tinh').textContent    = fmt(tamTinh);
    document.getElementById('phi-vc').textContent      = fmt(phiVC);
    document.getElementById('tong-cong').textContent   = fmt(tongCong);
    document.getElementById('item-count').textContent  = totalItems;
}

// ─── Xóa 1 item ──────────────────────────────────────────────────────────────
async function removeItem(maCTGH) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/cart/${maCTGH}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) {
            // Xóa dòng khỏi DOM ngay lập tức
            const row = document.getElementById(`row-${maCTGH}`);
            if (row) row.remove();
            
            // Nếu không còn sản phẩm nào thì reload để hiện trạng thái trống
            if (document.querySelectorAll('[id^="row-"]').length === 0) {
                loadCart();
            } else {
                updateGlobalSummaryLocally();
            }
            if (window.updateCartCount) window.updateCartCount();
        } else {
            showToast(json.message, 'error');
        }
    } catch {
        showToast('Không thể kết nối server', 'error');
    }
}

// ─── Cập nhật phần tổng kết ──────────────────────────────────────────────────
function updateSummary(items) {
    const tamTinh = items.reduce((sum, i) => sum + parseFloat(i.thanhTien), 0);

    // Phí vận chuyển mặc định (sẽ được chọn ở trang thanh toán)
    const phiVC = tamTinh > 0 ? 15000 : 0;
    const tongCong = tamTinh + phiVC;

    const fmt = (n) => Number(n).toLocaleString('vi-VN') + '₫';

    document.getElementById('tam-tinh').textContent    = fmt(tamTinh);
    document.getElementById('phi-vc').textContent      = fmt(phiVC);
    document.getElementById('tong-cong').textContent   = fmt(tongCong);
    document.getElementById('item-count').textContent  =
        items.reduce((sum, i) => sum + i.soLuong, 0);
}

// ─── Trạng thái chưa đăng nhập ───────────────────────────────────────────────
function showLoginPrompt() {
    document.getElementById('cart-table').classList.add('hidden');
    document.getElementById('cart-summary').classList.add('hidden');
    document.getElementById('cart-empty').classList.add('hidden');
    document.getElementById('cart-login').classList.remove('hidden');
}

// ─── Skeleton loading ────────────────────────────────────────────────────────
function showSkeleton() {
    const tbody = document.getElementById('cart-tbody');
    tbody.innerHTML = Array(2).fill(0).map(() => `
        <tr class="animate-pulse">
            <td class="px-6 py-8">
                <div class="flex items-center gap-6">
                    <div class="w-24 h-24 bg-surface-container rounded"></div>
                    <div class="space-y-2">
                        <div class="h-5 bg-surface-container rounded w-40"></div>
                        <div class="h-4 bg-surface-container rounded w-24"></div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-8"><div class="h-5 bg-surface-container rounded w-20 mx-auto"></div></td>
            <td class="px-6 py-8"><div class="h-8 bg-surface-container rounded w-28 mx-auto"></div></td>
            <td class="px-6 py-8"><div class="h-5 bg-surface-container rounded w-20 ml-auto"></div></td>
        </tr>
    `).join('');
}

// ─── Hiển thị lỗi ────────────────────────────────────────────────────────────
function showError(msg) {
    document.getElementById('cart-table').classList.add('hidden');
    document.getElementById('cart-summary').classList.add('hidden');
    document.getElementById('cart-empty').innerHTML = `
        <div class="flex flex-col items-center py-20 text-center">
            <span class="material-symbols-outlined text-5xl text-red-400 mb-4">error_outline</span>
            <p class="font-body-lg text-on-surface-variant">${msg}</p>
            <button onclick="loadCart()" class="mt-4 px-6 py-2 bg-primary text-white rounded font-label-caps text-sm hover:opacity-90">
                Thử lại
            </button>
        </div>
    `;
    document.getElementById('cart-empty').classList.remove('hidden');
}

// ─── Toast thông báo ─────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
    const existing = document.getElementById('toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg text-white text-sm font-medium
        ${type === 'error' ? 'bg-red-600' : 'bg-stone-800'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
