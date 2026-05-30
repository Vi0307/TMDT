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
    sp.soLuongTon = 50; // Always show Còn hàng (50) for all products
    const imgSrc = sp.hinhAnh
        ? (sp.hinhAnh.startsWith('http://') || sp.hinhAnh.startsWith('https://') || sp.hinhAnh.startsWith('data:') ? sp.hinhAnh : `images/${sp.hinhAnh}`)
        : 'https://placehold.co/600x750/f0eee9/837562?text=No+Image';

    // Ảnh chính
    const mainImg = document.getElementById('main-image');
    if (mainImg) {
        mainImg.src = imgSrc;
        mainImg.alt = sp.tenSanPham;
    }

    // Thumbnail container: hide since we only use a single image
    const thumbContainer = document.getElementById('thumbnails');
    if (thumbContainer) {
        thumbContainer.innerHTML = '';
        thumbContainer.classList.add('hidden');
    }

    setupLightbox([imgSrc]);
    setupZoom();

    // Danh mục badge
    const catEl = document.getElementById('product-category');
    if (catEl) catEl.textContent = sp.tenDanhMuc || 'Sản phẩm';

    // Tên
    const nameEl = document.getElementById('product-name');
    if (nameEl) nameEl.textContent = sp.tenSanPham;

    // Sao + số đánh giá
    const starEl = document.getElementById('product-stars');
    const reviewCountEl = document.getElementById('review-count');
    if (starEl) starEl.innerHTML = renderStarsHtml(sp.diemTrungBinh || 0);
    if (reviewCountEl) reviewCountEl.textContent = `(${sp.soLuongDanhGia || 0} Đánh giá)`;

    // Giá
    const priceEl = document.getElementById('product-price');
    if (priceEl) {
        priceEl.textContent = Number(sp.gia).toLocaleString('vi-VN') + ' VNĐ';
    }

    // Mô tả
    const shortDescEl = document.getElementById('product-desc-short');
    const fullDescEl = document.getElementById('product-desc');
    if (shortDescEl) shortDescEl.textContent = sp.moTaNgan || 'Tuyệt phẩm thủ công độc đáo mang đậm linh hồn di sản.';
    if (fullDescEl) fullDescEl.textContent = sp.moTaChiTiet || '';

    // Thông số chi tiết (cho tab Specs)
    const setSpec = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val || '—';
    };
    setSpec('spec-category', sp.tenDanhMuc);
    setSpec('spec-id',       sp.maSanPham);
    setSpec('spec-origin',   sp.xuatXu);
    setSpec('spec-material', sp.chatLieu);
    setSpec('spec-size',     sp.kichThuoc);
    setSpec('spec-weight',   sp.trongLuong);
    setSpec('spec-care',     sp.huongDanBaoQuan);

    // Tồn kho & dot indicator
    const stockEl = document.getElementById('product-stock');
    const stockDot = document.getElementById('stock-dot');
    if (sp.soLuongTon <= 0) {
        if (stockEl) stockEl.innerHTML = `<span class="text-red-600 font-bold">Hết hàng</span>`;
        if (stockDot) {
            stockDot.className = "inline-block w-2.5 h-2.5 rounded-full bg-red-500";
        }
        const addBtn = document.getElementById('btn-add-cart');
        const buyBtn = document.getElementById('btn-buy-now');
        if (addBtn) {
            addBtn.disabled = true;
            addBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        if (buyBtn) {
            buyBtn.disabled = true;
            buyBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    } else if (sp.soLuongTon <= 5) {
        if (stockEl) stockEl.innerHTML = `<span class="text-amber-600 font-bold">Chỉ còn ${sp.soLuongTon} sản phẩm</span>`;
        if (stockDot) {
            stockDot.className = "inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse";
        }
    } else {
        if (stockEl) stockEl.innerHTML = `<span class="text-green-700 dark:text-green-400 font-bold">Còn hàng (${sp.soLuongTon})</span>`;
        if (stockDot) {
            stockDot.className = "inline-block w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse";
        }
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
    const total = reviews.length;
    const avgScore = total > 0 
        ? (reviews.reduce((sum, r) => sum + r.soSao, 0) / total) 
        : 0;

    // Fill big circular score card
    const ratingAvgBig = document.getElementById('rating-avg-big');
    if (ratingAvgBig) ratingAvgBig.textContent = avgScore > 0 ? avgScore.toFixed(1) : '0.0';

    const ratingStarsBig = document.getElementById('rating-stars-big');
    if (ratingStarsBig) ratingStarsBig.innerHTML = renderStarsHtml(avgScore);

    const ratingCountBig = document.getElementById('rating-count-big');
    if (ratingCountBig) ratingCountBig.textContent = `${total} lượt đánh giá`;

    // Fill bar breakdown
    const barsContainer = document.getElementById('rating-bars-container');
    if (barsContainer) {
        if (total === 0) {
            barsContainer.innerHTML = [5, 4, 3, 2, 1].map(stars => `
                <div class="flex items-center gap-3 text-sm">
                    <span class="w-12 text-stone-400 font-semibold text-right">${stars} sao</span>
                    <div class="flex-grow h-2.5 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden shadow-inner">
                        <div class="h-full bg-amber-500 rounded-full" style="width: 0%"></div>
                    </div>
                    <span class="w-8 text-stone-400 text-right font-medium">0%</span>
                </div>
            `).join('');
        } else {
            const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
            reviews.forEach(r => {
                const s = Math.round(r.soSao);
                if (distribution[s] !== undefined) distribution[s]++;
            });

            barsContainer.innerHTML = [5, 4, 3, 2, 1].map(stars => {
                const count = distribution[stars];
                const percent = Math.round((count / total) * 100);
                return `
                    <div class="flex items-center gap-3 text-sm">
                        <span class="w-12 text-stone-600 dark:text-stone-400 font-semibold text-right">${stars} sao</span>
                        <div class="flex-grow h-2.5 bg-stone-200 dark:bg-stone-850 rounded-full overflow-hidden shadow-inner">
                            <div class="h-full bg-amber-500 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
                        </div>
                        <span class="w-8 text-stone-500 dark:text-stone-400 text-right font-semibold">${percent}%</span>
                    </div>
                `;
            }).join('');
        }
    }

    const container = document.getElementById('review-list');
    if (!container) return;

    if (total === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-center bg-stone-50 dark:bg-stone-900/20 rounded-2xl border border-stone-100 dark:border-stone-800/80">
                <span class="material-symbols-outlined text-4xl text-stone-300 dark:text-stone-700 mb-2">rate_review</span>
                <p class="text-stone-500 italic font-medium">
                    Chưa có đánh giá nào cho sản phẩm này.
                </p>
            </div>`;
        return;
    }

    container.innerHTML = reviews.map(rv => {
        const ngay = rv.ngayDanhGia
            ? new Date(rv.ngayDanhGia).toLocaleDateString('vi-VN')
            : '';
        const stars = renderStarsHtml(rv.soSao);

        const phanHoi = rv.phanHoiAdmin ? `
            <div class="mt-4 ml-6 pl-4 border-l-4 border-primary bg-primary/5 dark:bg-stone-800/30 rounded-r-2xl p-4">
                <p class="text-xs font-bold text-primary mb-1 uppercase tracking-widest">PHẢN HỒI TỪ CỬA HÀNG</p>
                <p class="text-sm text-stone-600 dark:text-stone-350 leading-relaxed italic">${rv.phanHoiAdmin}</p>
            </div>` : '';

        // Tải ảnh đánh giá từ cột hinhAnh lưu ở cơ sở dữ liệu
        const localImages = JSON.parse(rv.hinhAnh || '[]');
        
        let imagesHtml = '';
        if (localImages.length > 0) {
            imagesHtml = `
                <div class="flex flex-wrap gap-3 mt-3">
                    ${localImages.map(img => {
                        const isVideo = img.startsWith('data:video/') || img.includes('.mp4') || img.startsWith('data:application/octet-stream');
                        if (isVideo) {
                            return `
                                <div class="w-24 h-24 bg-black rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 relative group cursor-pointer" onclick="openLightbox('${img}')">
                                    <video class="w-full h-full object-cover" src="${img}" muted></video>
                                    <div class="absolute inset-0 flex items-center justify-center bg-black/25">
                                        <span class="material-symbols-outlined text-white text-xl">play_circle</span>
                                    </div>
                                </div>
                            `;
                        } else {
                            return `
                                <div class="w-24 h-24 bg-stone-50 dark:bg-stone-800 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 cursor-pointer" onclick="openLightbox('${img}')">
                                    <img class="w-full h-full object-cover hover:scale-105 transition-transform duration-300" src="${img}" alt="Review image" />
                                </div>
                            `;
                        }
                    }).join('')}
                </div>
            `;
        }

        return `
            <div class="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-100 dark:border-stone-850 shadow-sm space-y-4 hover:shadow-md transition-all">
                <div class="flex items-start justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center uppercase shadow-inner text-sm">
                            ${(rv.tenNguoiDung || 'K').charAt(0)}
                        </div>
                        <div>
                            <p class="font-bold text-stone-800 dark:text-stone-200">${rv.tenNguoiDung || 'Khách hàng'}</p>
                            <div class="flex items-center gap-0.5 text-amber-500 mt-1">${stars}</div>
                        </div>
                    </div>
                    <span class="text-xs font-semibold text-stone-400">${ngay}</span>
                </div>
                <p class="text-sm text-stone-600 dark:text-stone-300 leading-relaxed pl-1 whitespace-pre-line">${rv.binhLuan || ''}</p>
                ${imagesHtml}
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
                ? (sp.hinhAnh.startsWith('http://') || sp.hinhAnh.startsWith('https://') || sp.hinhAnh.startsWith('data:') ? sp.hinhAnh : `images/${sp.hinhAnh}`)
                : 'https://placehold.co/400x533/f0eee9/837562?text=No+Image';
            const giaFmt = Number(sp.gia).toLocaleString('vi-VN') + ' VNĐ';

            return `
                <div class="group cursor-pointer bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-100 dark:border-stone-850 shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between h-full" onclick="window.location.href='chitietsanpham.html?id=${sp.maSanPham}'">
                    <div>
                        <div class="aspect-[3/4] rounded-xl overflow-hidden relative mb-4 bg-stone-50 dark:bg-stone-800 shadow-inner">
                            <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                 src="${imgSrc}" alt="${sp.tenSanPham}"
                                 onerror="this.src='https://placehold.co/400x533/f0eee9/837562?text=No+Image'"/>
                            <!-- Hover Quick View overlay -->
                            <div class="absolute inset-0 bg-stone-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <span class="bg-white/90 backdrop-blur-sm text-stone-800 text-xs px-3.5 py-2 rounded-full font-bold uppercase tracking-wider shadow">Xem Chi Tiết</span>
                            </div>
                        </div>
                        <h3 class="font-bold text-base text-stone-800 dark:text-stone-200 mb-1 group-hover:text-primary transition-colors line-clamp-1">${sp.tenSanPham}</h3>
                    </div>
                    <p class="font-bold text-sm text-secondary dark:text-red-400 mt-2">${giaFmt}</p>
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
    if (input) input.value = soLuong;
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
    if (!btn) return;
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
        window.location.href = 'dathang.html';
    } catch {
        window.location.href = 'dathang.html';
    }
}

// ─── Chuyển tab ──────────────────────────────────────────────────────────────
function switchTab(tabName) {
    const tabs = document.querySelectorAll('[data-tab]');
    const panels = document.querySelectorAll('[data-panel]');

    tabs.forEach(t => {
        if (t.dataset.tab === tabName) {
            t.className = 'pb-4 border-b-2 border-primary text-primary font-bold text-base transition-all duration-300';
        } else {
            t.className = 'pb-4 border-b-2 border-transparent text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 font-bold text-base transition-all duration-300';
        }
    });

    panels.forEach(p => {
        p.style.display = p.dataset.panel === tabName ? 'block' : 'none';
    });
}

// ─── Setup Zoom (Magnifier Lens) ─────────────────────────────────────────────
function setupZoom() {
    const container = document.querySelector('.zoom-container');
    const img = document.getElementById('main-image');
    if (!container || !img) return;

    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        img.style.setProperty('--zoom-x', `${x}%`);
        img.style.setProperty('--zoom-y', `${y}%`);
    });

    container.addEventListener('mouseleave', () => {
        img.style.setProperty('--zoom-x', '50%');
        img.style.setProperty('--zoom-y', '50%');
    });
}

// ─── Setup Lightbox ──────────────────────────────────────────────────────────
let galleryImages = [];
let currentImgIndex = 0;

function setupLightbox(images) {
    galleryImages = images;
    
    const mainImg = document.getElementById('main-image');
    if (mainImg) {
        mainImg.addEventListener('click', () => {
            openLightbox(mainImg.src);
        });
    }

    // Lightbox controls
    const modal = document.getElementById('lightbox-modal');
    const closeBtn = document.getElementById('lightbox-close');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');

    if (closeBtn) closeBtn.onclick = closeLightbox;
    
    if (prevBtn) {
        prevBtn.onclick = prevLightbox;
        if (galleryImages.length <= 1) {
            prevBtn.classList.add('hidden');
        } else {
            prevBtn.classList.remove('hidden');
        }
    }
    if (nextBtn) {
        nextBtn.onclick = nextLightbox;
        if (galleryImages.length <= 1) {
            nextBtn.classList.add('hidden');
        } else {
            nextBtn.classList.remove('hidden');
        }
    }

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if (!modal || modal.classList.contains('hidden')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') prevLightbox();
        if (e.key === 'ArrowRight') nextLightbox();
    });
    
    // Backdrop click
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) closeLightbox();
        };
    }
}

function openLightbox(src) {
    const modal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-image');
    const caption = document.getElementById('lightbox-caption');
    if (!modal || !lightboxImg) return;

    currentImgIndex = galleryImages.indexOf(src);
    if (currentImgIndex === -1) currentImgIndex = 0;

    lightboxImg.src = src;
    if (caption && currentProduct) {
        caption.textContent = `${currentProduct.tenSanPham} (${currentImgIndex + 1}/${galleryImages.length})`;
    }

    modal.classList.remove('hidden');
    // Smooth transition
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100', 'flex');
    }, 10);
}

// ─── Đóng Lightbox ───────────────────────────────────────────────────────────
function closeLightbox() {
    const modal = document.getElementById('lightbox-modal');
    if (!modal) return;

    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

// ─── Điều hướng ảnh Lightbox ──────────────────────────────────────────────────
function prevLightbox() {
    if (galleryImages.length <= 1) return;
    currentImgIndex = (currentImgIndex - 1 + galleryImages.length) % galleryImages.length;
    updateLightboxImg();
}

function nextLightbox() {
    if (galleryImages.length <= 1) return;
    currentImgIndex = (currentImgIndex + 1) % galleryImages.length;
    updateLightboxImg();
}

function updateLightboxImg() {
    const lightboxImg = document.getElementById('lightbox-image');
    const caption = document.getElementById('lightbox-caption');
    if (!lightboxImg) return;

    const src = galleryImages[currentImgIndex];
    lightboxImg.src = src;
    if (caption && currentProduct) {
        caption.textContent = `${currentProduct.tenSanPham} (${currentImgIndex + 1}/${galleryImages.length})`;
    }
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
    const existing = document.getElementById('toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3.5 rounded-xl shadow-lg border text-sm font-semibold tracking-wide transition-all duration-300 transform scale-90 opacity-0
        ${type === 'error' 
            ? 'bg-red-500 border-red-400 text-white shadow-red-950/10' 
            : 'bg-stone-900 border-stone-800 text-white shadow-stone-950/20'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Shimmer dynamic show
    setTimeout(() => {
        toast.classList.remove('scale-90', 'opacity-0');
        toast.classList.add('scale-100', 'opacity-100');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('scale-100', 'opacity-100');
        toast.classList.add('scale-90', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ─── Skeleton loading ────────────────────────────────────────────────────────
function showSkeleton() {
    const nameEl = document.getElementById('product-name');
    const priceEl = document.getElementById('product-price');
    const descEl = document.getElementById('product-desc-short');
    
    if (nameEl) nameEl.innerHTML = `<div class="h-8 bg-stone-200 dark:bg-stone-850 rounded w-2/3 animate-pulse"></div>`;
    if (priceEl) priceEl.innerHTML = `<div class="h-8 bg-stone-200 dark:bg-stone-850 rounded w-1/3 animate-pulse"></div>`;
    if (descEl) descEl.innerHTML = `<div class="h-4 bg-stone-150 dark:bg-stone-850 rounded w-full animate-pulse mb-2"></div><div class="h-4 bg-stone-150 dark:bg-stone-850 rounded w-5/6 animate-pulse"></div>`;
}

// ─── Hiển thị lỗi ────────────────────────────────────────────────────────────
function showError(msg) {
    const mainEl = document.querySelector('main');
    if (mainEl) {
        mainEl.innerHTML = `
            <div class="flex flex-col items-center justify-center py-32 text-center bg-white dark:bg-stone-900 max-w-2xl mx-auto rounded-3xl border border-stone-100 dark:border-stone-850 shadow-sm p-12">
                <span class="material-symbols-outlined text-7xl text-amber-600 mb-6 bg-amber-50 p-4 rounded-full animate-bounce">error_outline</span>
                <h2 class="font-display-lg text-2xl font-bold text-[#4A2C2A] dark:text-amber-500 mb-3">Không tìm thấy sản phẩm</h2>
                <p class="text-stone-500 dark:text-stone-400 mb-8 max-w-md">${msg}</p>
                <a href="sanpham.html" class="bg-[#4A2C2A] hover:bg-[#3d2422] text-white px-8 py-3.5 rounded-xl font-bold text-sm tracking-wider uppercase transition-all duration-300 shadow-md active:scale-95">
                    Quay lại danh sách sản phẩm
                </a>
            </div>
        `;
    }
}

