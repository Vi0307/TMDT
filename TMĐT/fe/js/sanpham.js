/**
 * sanpham.js
 * Lấy danh sách sản phẩm từ API và render lên trang sanpham.html
 *
 * API: GET http://localhost:3005/api/products
 * Query params: keyword, category, minPrice, maxPrice, page, limit
 */

const API_URL = 'http://localhost:3005/api';

// ─── State ───────────────────────────────────────────────────────────────────
let currentPage = 1;
const LIMIT = 6;
let currentFilters = {
    keyword: '',
    category: '',
    minPrice: '',
    maxPrice: ''
};

// ─── Khởi động ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await loadCategories();
    await loadProducts();
    setupEvents();
});

// ─── Load danh mục vào sidebar ───────────────────────────────────────────────
async function loadCategories() {
    try {
        const res = await fetch(`${API_URL}/categories`);
        const json = await res.json();
        if (!json.success) return;

        const container = document.getElementById('category-filter');
        if (!container) return;

        container.innerHTML = '';

        // Thêm option "Tất cả"
        container.innerHTML = `
            <label class="flex items-center group cursor-pointer">
                <input type="radio" name="category" value="" checked
                    class="w-4 h-4 border-outline text-primary focus:ring-primary accent-primary"/>
                <span class="ml-3 font-body-md text-on-surface-variant group-hover:text-primary transition-colors">Tất cả</span>
            </label>
        `;

        json.data.forEach(cat => {
            container.innerHTML += `
                <label class="flex items-center group cursor-pointer">
                    <input type="radio" name="category" value="${cat.maDanhMuc}"
                        class="w-4 h-4 border-outline text-primary focus:ring-primary accent-primary"/>
                    <span class="ml-3 font-body-md text-on-surface-variant group-hover:text-primary transition-colors">
                        ${cat.tenDanhMuc}
                    </span>
                </label>
            `;
        });

        // Gắn sự kiện sau khi render
        container.querySelectorAll('input[name="category"]').forEach(input => {
            input.addEventListener('change', () => {
                currentFilters.category = input.value;
                currentPage = 1;
                loadProducts();
            });
        });
    } catch (err) {
        console.error('loadCategories error:', err);
    }
}

// ─── Load sản phẩm ───────────────────────────────────────────────────────────
async function loadProducts() {
    const grid = document.getElementById('product-grid');
    const countEl = document.getElementById('product-count');
    const paginationEl = document.getElementById('pagination');

    // Hiển thị skeleton loading
    grid.innerHTML = Array(LIMIT).fill(0).map(() => `
        <div class="group animate-pulse">
            <div class="aspect-[3/4] bg-surface-container rounded-lg mb-4"></div>
            <div class="h-5 bg-surface-container rounded w-3/4 mb-2"></div>
            <div class="h-4 bg-surface-container rounded w-1/2 mb-3"></div>
            <div class="h-8 bg-surface-container rounded w-full"></div>
        </div>
    `).join('');

    try {
        // Build query string
        const params = new URLSearchParams({
            page: currentPage,
            limit: LIMIT
        });
        if (currentFilters.keyword)  params.set('keyword',  currentFilters.keyword);
        if (currentFilters.category) params.set('category', currentFilters.category);
        if (currentFilters.minPrice) params.set('minPrice', currentFilters.minPrice);
        if (currentFilters.maxPrice) params.set('maxPrice', currentFilters.maxPrice);

        const res = await fetch(`${API_URL}/products?${params}`);
        const json = await res.json();

        if (!json.success) {
            grid.innerHTML = `<p class="col-span-3 text-center text-on-surface-variant py-20">Không thể tải sản phẩm.</p>`;
            return;
        }

        const { data, pagination } = json;

        // Cập nhật số lượng
        if (countEl) countEl.textContent = pagination.total;

        // Render sản phẩm
        if (data.length === 0) {
            grid.innerHTML = `
                <div class="col-span-3 text-center py-20">
                    <span class="material-symbols-outlined text-5xl text-on-surface-variant mb-4 block">search_off</span>
                    <p class="font-body-lg text-on-surface-variant">Không tìm thấy sản phẩm nào.</p>
                </div>
            `;
        } else {
            grid.innerHTML = data.map(sp => renderProductCard(sp)).join('');
        }

        // Render phân trang
        renderPagination(pagination, paginationEl);

    } catch (err) {
        console.error('loadProducts error:', err);
        grid.innerHTML = `
            <div class="col-span-3 text-center py-20">
                <span class="material-symbols-outlined text-5xl text-red-400 mb-4 block">wifi_off</span>
                <p class="font-body-lg text-on-surface-variant">Không thể kết nối server.</p>
            </div>
        `;
    }
}

// ─── Render 1 card sản phẩm ──────────────────────────────────────────────────
function renderProductCard(sp) {
    const imgSrc = sp.hinhAnh
        ? `images/${sp.hinhAnh}`
        : 'images/placeholder.jpg';

    const giaFmt = Number(sp.gia).toLocaleString('vi-VN') + 'đ';

    // Badge: hàng sắp hết nếu tồn kho <= 5
    let badge = '';
    if (sp.soLuongTon <= 0) {
        badge = `<div class="absolute top-3 left-3 bg-gray-500 text-white font-label-caps text-[10px] px-2 py-1 rounded-sm">HẾT HÀNG</div>`;
    } else if (sp.soLuongTon <= 5) {
        badge = `<div class="absolute top-3 left-3 bg-error text-white font-label-caps text-[10px] px-2 py-1 rounded-sm">SẮP HẾT</div>`;
    }

    // Sao đánh giá
    const stars = renderStars(sp.diemTrungBinh);

    const isOutOfStock = sp.soLuongTon <= 0;

    return `
        <div class="group">
            <a href="chitietsanpham.html?id=${sp.maSanPham}"
               class="aspect-[3/4] overflow-hidden bg-surface-container rounded-lg relative mb-4 block">
                <img
                    class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    src="${imgSrc}"
                    alt="${sp.tenSanPham}"
                    onerror="this.src='https://placehold.co/400x533/f0eee9/837562?text=No+Image'"
                />
                ${badge}
            </a>
            <h4 class="font-title-sm text-on-surface mb-1 line-clamp-1">${sp.tenSanPham}</h4>
            <p class="font-body-md text-on-surface-variant text-sm mb-1 line-clamp-2">${sp.moTa || ''}</p>
            <div class="flex items-center gap-1 mb-3">
                ${stars}
                <span class="text-xs text-on-surface-variant">(${sp.soLuongDanhGia})</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="font-headline-md text-primary text-lg">${giaFmt}</span>
                <button
                    class="bg-secondary text-white px-4 py-2 font-label-caps text-xs rounded hover:bg-on-secondary-fixed-variant transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    onclick="addToCart('${sp.maSanPham}', '${sp.tenSanPham.replace(/'/g, "\\'")}')"
                    ${isOutOfStock ? 'disabled' : ''}>
                    <span class="material-symbols-outlined text-sm">shopping_bag</span>
                    ${isOutOfStock ? 'HẾT HÀNG' : 'THÊM VÀO GIỎ'}
                </button>
            </div>
        </div>
    `;
}

// ─── Render sao đánh giá ─────────────────────────────────────────────────────
function renderStars(score) {
    const full  = Math.floor(score);
    const half  = score - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    let html = '';
    for (let i = 0; i < full;  i++) html += `<span class="material-symbols-outlined text-amber-500 text-sm" style="font-variation-settings:'FILL' 1">star</span>`;
    if (half)                        html += `<span class="material-symbols-outlined text-amber-500 text-sm" style="font-variation-settings:'FILL' 1">star_half</span>`;
    for (let i = 0; i < empty; i++) html += `<span class="material-symbols-outlined text-stone-300 text-sm">star</span>`;
    return html;
}

// ─── Render phân trang ───────────────────────────────────────────────────────
function renderPagination(pagination, container) {
    if (!container) return;
    const { page, totalPages } = pagination;
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = `
        <button onclick="changePage(${page - 1})" ${page <= 1 ? 'disabled' : ''}
            class="w-10 h-10 flex items-center justify-center rounded-full border border-outline-variant hover:bg-stone-100 transition-all disabled:opacity-40">
            <span class="material-symbols-outlined">chevron_left</span>
        </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
            html += `
                <button onclick="changePage(${i})"
                    class="w-10 h-10 flex items-center justify-center rounded-full font-bold transition-all
                    ${i === page ? 'bg-primary text-white' : 'border border-outline-variant hover:bg-stone-100'}">
                    ${i}
                </button>
            `;
        } else if (Math.abs(i - page) === 2) {
            html += `<span class="text-on-surface-variant">...</span>`;
        }
    }

    html += `
        <button onclick="changePage(${page + 1})" ${page >= totalPages ? 'disabled' : ''}
            class="w-10 h-10 flex items-center justify-center rounded-full border border-outline-variant hover:bg-stone-100 transition-all disabled:opacity-40">
            <span class="material-symbols-outlined">chevron_right</span>
        </button>
    `;

    container.innerHTML = html;
}

// ─── Chuyển trang ────────────────────────────────────────────────────────────
function changePage(page) {
    currentPage = page;
    loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Thêm vào giỏ hàng ───────────────────────────────────────────────────────
async function addToCart(maSanPham, tenSanPham) {
    const token = localStorage.getItem('token');
    if (!token) {
        if (confirm(`Bạn cần đăng nhập để thêm "${tenSanPham}" vào giỏ hàng.\nĐăng nhập ngay?`)) {
            window.location.href = 'dangnhap.html';
        }
        return;
    }

    try {
        const res = await fetch(`${API_URL}/cart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ maSanPham, soLuong: 1 })
        });
        const json = await res.json();

        if (json.success) {
            showToast(`✓ Đã thêm "${tenSanPham}" vào giỏ hàng`);
            if (window.updateCartCount) window.updateCartCount();
        } else {
            showToast(json.message || 'Không thể thêm vào giỏ hàng', 'error');
        }
    } catch (err) {
        showToast('Không thể kết nối server', 'error');
    }
}

// ─── Toast thông báo ─────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
    const existing = document.getElementById('toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all
        ${type === 'error' ? 'bg-red-600' : 'bg-stone-800'}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}

// ─── Gắn sự kiện tìm kiếm & lọc giá ─────────────────────────────────────────
function setupEvents() {
    // Tìm kiếm
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        let timeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                currentFilters.keyword = searchInput.value.trim();
                currentPage = 1;
                loadProducts();
            }, 400);
        });
    }

    // Lọc giá
    const priceRange = document.getElementById('price-range');
    if (priceRange) {
        priceRange.addEventListener('input', () => {
            currentFilters.maxPrice = priceRange.value;
            currentPage = 1;
            loadProducts();
        });
    }
}
