/**
 * trangchu.js
 * Xử lý tải dữ liệu sản phẩm và danh mục từ API cho trang chủ
 */

const API_URL = 'http://localhost:3005/api';

document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
        loadCategories(),
        loadNewProducts()
    ]);
});

async function loadCategories() {
    const container = document.getElementById('category-container');
    if (!container) return;

    try {
        const res = await fetch(`${API_URL}/categories`);
        const json = await res.json();

        if (json.success) {
            const categories = json.data;
            // Chỉ lấy 4 danh mục tiêu biểu để render vào bento grid
            container.innerHTML = categories.slice(0, 4).map((cat, index) => {
                let colSpan = index === 0 ? 'md:col-span-2 md:row-span-2' : (index === 1 ? 'md:col-span-2' : '');
                let imgSrc = cat.hinhAnh ? `images/${cat.hinhAnh}` : 'https://placehold.co/600x400?text=' + encodeURIComponent(cat.tenDanhMuc);
                
                return `
                    <div class="${colSpan} relative group overflow-hidden rounded-lg cursor-pointer" onclick="window.location.href='sanpham.html?category=${cat.maDanhMuc}'">
                        <img class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                             src="${imgSrc}" 
                             alt="${cat.tenDanhMuc}"
                             onerror="this.src='https://placehold.co/600x400?text=${encodeURIComponent(cat.tenDanhMuc)}'">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-8">
                            <h3 class="font-title-sm text-title-sm text-white mb-2">${cat.tenDanhMuc}</h3>
                            <p class="text-white/80 text-sm font-body-md opacity-0 group-hover:opacity-100 transition-opacity">Khám phá bộ sưu tập di sản.</p>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (err) {
        console.error('Lỗi tải danh mục:', err);
    }
}

async function loadNewProducts() {
    const container = document.getElementById('product-container');
    if (!container) return;

    try {
        const res = await fetch(`${API_URL}/products?limit=4`);
        const json = await res.json();

        if (json.success) {
            const products = json.data;
            container.innerHTML = products.map(sp => {
                const giaFmt = Number(sp.gia).toLocaleString('vi-VN') + ' VNĐ';
                const imgSrc = sp.hinhAnh ? `images/${sp.hinhAnh}` : 'https://placehold.co/400x500?text=' + encodeURIComponent(sp.tenSanPham);
                
                return `
                    <div class="bg-surface p-base rounded-lg shadow-sm hover:shadow-md transition-shadow group cursor-pointer" 
                         onclick="window.location.href='chitietsanpham.html?id=${sp.maSanPham}'">
                        <div class="relative overflow-hidden aspect-[4/5] mb-stack-sm rounded">
                            <img class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                 src="${imgSrc}" 
                                 alt="${sp.tenSanPham}"
                                 onerror="this.src='https://placehold.co/400x500?text=${encodeURIComponent(sp.tenSanPham)}'">
                            ${sp.soLuongTon < 10 ? '<span class="absolute top-4 left-4 bg-secondary text-white px-2 py-1 text-[10px] font-bold rounded">SẮP HẾT</span>' : ''}
                        </div>
                        <div class="p-stack-sm text-center">
                            <h4 class="font-title-sm text-[18px] text-on-surface mb-1 truncate">${sp.tenSanPham}</h4>
                            <p class="font-body-md text-secondary font-semibold">${giaFmt}</p>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (err) {
        console.error('Lỗi tải sản phẩm mới:', err);
        container.innerHTML = '<p class="col-span-full text-center py-10 text-outline">Không thể tải sản phẩm. Vui lòng thử lại sau.</p>';
    }
}
