/**
 * chitietsanpham.js
 * Lấy chi tiết sản phẩm từ API và render lên trang chitietsanpham.html
 *
 * API:
 *   GET /api/products/:id        - Chi tiết sản phẩm + đánh giá
 *   GET /api/products?category=X - Sản phẩm cùng danh mục (liên quan)
 *   POST /api/cart               - Thêm vào giỏ hàng
 */

const API_URL = 'http://localhost:3005/api';

let currentProduct = null;
let soLuong = 1;

// ─── Khởi động ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
        showError('Không tìm thấy sản phẩm. Vui lòng quay lại trang sản phẩm.');
        return;
    }

    await loadProductDetail(id);
});

// ─── Load chi tiết sản phẩm ──────────────────────────────────────────────────
async function loadProductDetail(id) {
    try {
        showSkeleton();

        const res = await fetch(`${API_URL}/products/${id}`);
        const json = await res.json();

        if (!json.success) {
            showError(json.message || 'Không tìm thấy sản phẩm.');
            return;
        }

        currentProduct = json.data;
        renderProduct(currentProduct);
        renderReviews(currentProduct.danhGia || []);
        await loadRelatedProducts(currentProduct.maDanhMuc, id);

    } catch (err) {
        console.error('loadProductDetail error:', err);
        showError('Không thể kết nối server.');
    }
}

// ─── Render thông tin sản phẩm ───────────────────────────────────────────────
function renderProduct(sp) {
    const imgSrc = sp.hinhAnh
        ? `images/${sp.hinhAnh}`
        : 'https://placehold.co/600x750/f0eee9/837562?text=No+Image';

    // Ảnh chính
    document.getElementById('main-image').src = imgSrc;
    document.getElementById('main-image').alt = sp.tenSanPham;

    // Thumbnail (chỉ có 1 ảnh thực, còn lại placeholder)
    const thumbContainer = document.getElementById('thumbnails');
    thumbContainer.innerHTML = `
        <div class="aspect-square bg-surface-container rounded-md overflow-hidden cursor-pointer border-2 border-primary">
            <img class="w-full h-full object-cover" src="${imgSrc}" alt="${sp.tenSanPham}"
                 onerror="this.src='https://placehold.co/200x200/f0eee9/837562?text=No+Image'"/>
        </div>
    `;

    // Danh mục badge
    document.getElementById('product-category').textContent = sp.tenDanhMuc || 'Sản phẩm';

    // Tên
    document.getElementById('product-name').textContent = sp.tenSanPham;

    // Sao + số đánh giá
    const starEl = document.getElementById('product-stars');
    const reviewCountEl = document.getElementById('review-count');
    starEl.innerHTML = renderStarsHtml(sp.diemTrungBinh || 0);
    reviewCountEl.textContent = `(${sp.soLuongDanhGia || 0} Đánh giá)`;

    // Giá
    document.getElementById('product-price').textContent =
        Number(sp.gia).toLocaleString('vi-VN') + ' VNĐ';

    // Mô tả
    document.getElementById('product-desc-short').textContent = sp.moTaNgan || '';
    document.getElementById('product-desc').textContent = sp.moTaChiTiet || '';

    // Thông số chi tiết (cho tab Specs)
    const setSpec = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val || '—';
    };
    setSpec('spec-category', sp.tenDanhMuc);
    setSpec('spec-id',       sp.maSanPham);
    setSpec('spec-stock',    sp.soLuongTon > 0 ? sp.soLuongTon + ' sản phẩm' : 'Hết hàng');
    setSpec('spec-rating',   sp.diemTrungBinh ? Number(sp.diemTrungBinh).toFixed(1) + ' / 5' : 'Chưa có');
    setSpec('spec-review-count', (sp.soLuongDanhGia || 0) + ' lượt');
    setSpec('spec-origin',   sp.xuatXu);
    setSpec('spec-material', sp.chatLieu);
    setSpec('spec-size',     sp.kichThuoc);
    setSpec('spec-weight',   sp.trongLuong);
    setSpec('spec-care',     sp.huongDanBaoQuan);

    // Tồn kho
    const stockEl = document.getElementById('product-stock');
    if (sp.soLuongTon <= 0) {
        stockEl.innerHTML = `<span class="text-red-600 font-semibold">Hết hàng</span>`;
        document.getElementById('btn-add-cart').disabled = true;
        document.getElementById('btn-buy-now').disabled = true;
        document.getElementById('btn-add-cart').classList.add('opacity-50', 'cursor-not-allowed');
        document.getElementById('btn-buy-now').classList.add('opacity-50', 'cursor-not-allowed');
    } else if (sp.soLuongTon <= 5) {
        stockEl.innerHTML = `<span class="text-amber-600 font-semibold">Còn ${sp.soLuongTon} sản phẩm</span>`;
    } else {
        stockEl.innerHTML = `<span class="text-green-700 font-semibold">Còn hàng (${sp.soLuongTon})</span>`;
    }

    // Cập nhật title trang
    document.title = `${sp.tenSanPham} – Hội An Tinh Hoa`;
}

// ─── Render sao ──────────────────────────────────────────────────────────────
function renderStarsHtml(score) {
    const full  = Math.floor(score);
    const half  = score - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    let html = '';
    for (let i = 0; i < full;  i++)
        html += `<span class="material-symbols-outlined text-sm" style="font-variation-settings:'FILL' 1">star</span>`;
    if (half)
        html += `<span class="material-symbols-outlined text-sm" style="font-variation-settings:'FILL' 1">star_half</span>`;
    for (let i = 0; i < empty; i++)
        html += `<span class="material-symbols-outlined text-sm">star</span>`;
    return html;
}

// ─── Render đánh giá ─────────────────────────────────────────────────────────
function renderReviews(reviews) {
    const container = document.getElementById('review-list');
    if (!container) return;

    if (reviews.length === 0) {
        container.innerHTML = `
            <p class="text-on-surface-variant italic text-center py-8">
                Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá sản phẩm này!
            </p>`;
        return;
    }

    container.innerHTML = reviews.map(rv => {
        const ngay = rv.ngayDanhGia
            ? new Date(rv.ngayDanhGia).toLocaleDateString('vi-VN')
            : '';
        const stars = renderStarsHtml(rv.soSao);

        const phanHoi = rv.phanHoiAdmin ? `
            <div class="mt-3 ml-4 pl-4 border-l-2 border-primary/30 bg-primary/5 rounded-r-lg p-3">
                <p class="text-xs font-label-caps text-primary mb-1">PHẢN HỒI TỪ CỬA HÀNG</p>
                <p class="text-sm text-on-surface-variant">${rv.phanHoiAdmin}</p>
            </div>` : '';

        return `
            <div class="border-b border-outline-variant/20 pb-6 last:border-0">
                <div class="flex items-start justify-between mb-2">
                    <div>
                        <p class="font-semibold text-on-surface">${rv.tenNguoiDung || 'Khách hàng'}</p>
                        <div class="flex items-center gap-1 text-primary mt-1">${stars}</div>
                    </div>
                    <span class="text-xs text-on-surface-variant">${ngay}</span>
                </div>
                <p class="text-sm text-on-surface-variant leading-relaxed">${rv.binhLuan || ''}</p>
                ${phanHoi}
            </div>
        `;
    }).join('');
}

// ─── Load sản phẩm liên quan ─────────────────────────────────────────────────
async function loadRelatedProducts(maDanhMuc, currentId) {
    const container = document.getElementById('related-products');
    if (!container) return;

    try {
        const res = await fetch(`${API_URL}/products?category=${maDanhMuc}&limit=4`);
        const json = await res.json();
        if (!json.success) return;

        // Lọc bỏ sản phẩm hiện tại
        const related = json.data.filter(sp => sp.maSanPham !== currentId).slice(0, 4);

        if (related.length === 0) {
            container.closest('section').style.display = 'none';
            return;
        }

        container.innerHTML = related.map(sp => {
            const imgSrc = sp.hinhAnh
                ? `images/${sp.hinhAnh}`
                : 'https://placehold.co/400x533/f0eee9/837562?text=No+Image';
            const giaFmt = Number(sp.gia).toLocaleString('vi-VN') + ' VNĐ';

            return `
                <div class="group cursor-pointer" onclick="window.location.href='chitietsanpham.html?id=${sp.maSanPham}'">
                    <div class="aspect-[3/4] rounded-lg overflow-hidden relative mb-4 bg-surface-container shadow-sm group-hover:shadow-lg transition-all duration-300">
                        <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                             src="${imgSrc}" alt="${sp.tenSanPham}"
                             onerror="this.src='https://placehold.co/400x533/f0eee9/837562?text=No+Image'"/>
                    </div>
                    <h3 class="font-title-sm text-title-sm mb-1 group-hover:text-primary transition-colors line-clamp-1">${sp.tenSanPham}</h3>
                    <p class="font-body-md text-secondary font-bold">${giaFmt}</p>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('loadRelatedProducts error:', err);
    }
}

// ─── Điều chỉnh số lượng ─────────────────────────────────────────────────────
function changeQty(delta) {
    const input = document.getElementById('qty-input');
    const max = currentProduct?.soLuongTon || 99;
    soLuong = Math.max(1, Math.min(max, soLuong + delta));
    input.value = soLuong;
}

// ─── Thêm vào giỏ hàng ───────────────────────────────────────────────────────
async function addToCart() {
    if (!currentProduct) return;

    const token = localStorage.getItem('token');
    if (!token) {
        if (confirm('Bạn cần đăng nhập để thêm vào giỏ hàng.\nĐăng nhập ngay?')) {
            window.location.href = 'dangnhap.html';
        }
        return;
    }

    const btn = document.getElementById('btn-add-cart');
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin">progress_activity</span> Đang thêm...`;

    try {
        const res = await fetch(`${API_URL}/cart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ maSanPham: currentProduct.maSanPham, soLuong })
        });
        const json = await res.json();

        if (json.success) {
            showToast(`✓ Đã thêm "${currentProduct.tenSanPham}" vào giỏ hàng`);
            if (window.updateCartCount) window.updateCartCount();
        } else {
            showToast(json.message || 'Không thể thêm vào giỏ hàng', 'error');
        }
    } catch (err) {
        showToast('Không thể kết nối server', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<span class="material-symbols-outlined">shopping_bag</span> Thêm Vào Giỏ`;
    }
}

// ─── Mua ngay ────────────────────────────────────────────────────────────────
async function buyNow() {
    if (!currentProduct) return;

    const token = localStorage.getItem('token');
    if (!token) {
        if (confirm('Bạn cần đăng nhập để mua hàng.\nĐăng nhập ngay?')) {
            window.location.href = 'dangnhap.html';
        }
        return;
    }

    // Thêm vào giỏ rồi chuyển sang thanh toán
    try {
        await fetch(`${API_URL}/cart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ maSanPham: currentProduct.maSanPham, soLuong })
        });
        window.location.href = 'thanhtoan.html';
    } catch {
        window.location.href = 'thanhtoan.html';
    }
}

// ─── Chuyển tab ──────────────────────────────────────────────────────────────
function switchTab(tabName) {
    const tabs = document.querySelectorAll('[data-tab]');
    const panels = document.querySelectorAll('[data-panel]');

    tabs.forEach(t => {
        if (t.dataset.tab === tabName) {
            t.classList.add('border-primary', 'text-primary');
            t.classList.remove('border-transparent', 'text-outline');
        } else {
            t.classList.remove('border-primary', 'text-primary');
            t.classList.add('border-transparent', 'text-outline');
        }
    });

    panels.forEach(p => {
        p.style.display = p.dataset.panel === tabName ? 'block' : 'none';
    });
}

// ─── Toast ───────────────────────────────────────────────────────────────────
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

// ─── Skeleton loading ────────────────────────────────────────────────────────
function showSkeleton() {
    document.getElementById('product-name').textContent = 'Đang tải...';
    document.getElementById('product-price').textContent = '---';
    document.getElementById('product-desc-short').textContent = '';
    document.getElementById('product-desc').textContent = '';
}

// ─── Hiển thị lỗi ────────────────────────────────────────────────────────────
function showError(msg) {
    document.querySelector('main').innerHTML = `
        <div class="flex flex-col items-center justify-center py-32 text-center">
            <span class="material-symbols-outlined text-6xl text-on-surface-variant mb-4">error_outline</span>
            <h2 class="font-headline-md text-on-surface mb-2">Không tìm thấy sản phẩm</h2>
            <p class="text-on-surface-variant mb-6">${msg}</p>
            <a href="sanpham.html" class="bg-primary text-white px-6 py-3 rounded font-label-caps hover:opacity-90 transition-opacity">
                Quay lại danh sách sản phẩm
            </a>
        </div>
    `;
}
