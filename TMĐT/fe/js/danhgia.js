/**
 * danhgia.js
 * Xử lý giao diện và gửi đánh giá sản phẩm
 */

const API_URL = 'http://localhost:3005/api';
let selectedRating = 0;
let productId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'dangnhap.html';
        return;
    }

    const params = new URLSearchParams(window.location.search);
    productId = params.get('productId');

    if (!productId) {
        alert('Không tìm thấy thông tin sản phẩm cần đánh giá.');
        window.location.href = 'donhangcuatoi.html';
        return;
    }

    await loadProductInfo(productId);
    setupStarRating();
    setupSubmitButton();
    setupMediaUpload();
});

// --- Tải thông tin sản phẩm để hiển thị ---
async function loadProductInfo(id) {
    try {
        const res = await fetch(`${API_URL}/products/${id}`);
        const json = await res.json();
        if (json.success) {
            const p = json.data;
            document.getElementById('product-name').textContent = p.tenSanPham;
            document.getElementById('product-desc').textContent = `Mã SP: ${p.maSanPham}`;
            if (p.hinhAnh) {
                document.getElementById('product-img').src = p.hinhAnh.startsWith('http://') || p.hinhAnh.startsWith('https://') || p.hinhAnh.startsWith('data:') ? p.hinhAnh : `images/${p.hinhAnh}`;
            }
        }
    } catch (err) {
        console.error('Error loading product:', err);
    }
}

// --- Xử lý chọn sao ---
function setupStarRating() {
    const btns = document.querySelectorAll('.star-btn');
    const label = document.getElementById('star-label');
    const labels = {
        1: 'Tệ',
        2: 'Không hài lòng',
        3: 'Bình thường',
        4: 'Hài lòng',
        5: 'Tuyệt vời'
    };

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            selectedRating = parseInt(btn.getAttribute('data-value'));
            updateStars();
            label.textContent = labels[selectedRating];
        });

        // Hi ứng hover
        btn.addEventListener('mouseenter', () => {
            const val = parseInt(btn.getAttribute('data-value'));
            highlightStars(val);
        });

        btn.addEventListener('mouseleave', () => {
            updateStars();
        });
    });
}

function highlightStars(count) {
    const btns = document.querySelectorAll('.star-btn');
    btns.forEach((btn, idx) => {
        const icon = btn.querySelector('.material-symbols-outlined');
        if (idx < count) {
            icon.style.fontVariationSettings = "'FILL' 1";
            icon.classList.replace('text-outline-variant', 'text-primary');
        } else {
            icon.style.fontVariationSettings = "'FILL' 0";
            icon.classList.replace('text-primary', 'text-outline-variant');
        }
    });
}

function updateStars() {
    highlightStars(selectedRating);
}

// --- Gửi đánh giá ---
function setupSubmitButton() {
    const btn = document.getElementById('btn-submit');
    btn.addEventListener('click', async () => {
        if (selectedRating === 0) {
            alert('Vui lòng chọn số sao đánh giá.');
            return;
        }

        const binhLuan = document.getElementById('review-content').value.trim();
        const token = localStorage.getItem('token');

        try {
            btn.disabled = true;
            btn.textContent = 'Đang gửi...';

            // Đọc tất cả hình ảnh/video sang định dạng Base64
            const base64Promises = selectedMediaFiles.map(file => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });
            });
            const base64s = await Promise.all(base64Promises);

            const res = await fetch(`${API_URL}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    maSanPham: productId,
                    soSao: selectedRating,
                    binhLuan: binhLuan,
                    hinhAnh: base64s.length > 0 ? JSON.stringify(base64s) : null
                })
            });

            const json = await res.json();

            if (json.success) {
                alert('Cảm ơn bạn đã đánh giá sản phẩm!');
                window.location.href = 'donhangcuatoi.html';
            } else {
                alert(json.message || 'Có lỗi xảy ra khi gửi đánh giá.');
                btn.disabled = false;
                btn.textContent = 'Gửi đánh giá';
            }
        } catch (err) {
            console.error('Submit review error:', err);
            alert('Không thể kết nối server.');
            btn.disabled = false;
            btn.textContent = 'Gửi đánh giá';
        }
    });
}

// --- Xử lý tải lên và xem trước hình ảnh/video ---
let selectedMediaFiles = [];

function setupMediaUpload() {
    const fileInput = document.getElementById('file-input');
    if (!fileInput) return;

    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        
        files.forEach(file => {
            const images = selectedMediaFiles.filter(f => f.type.startsWith('image/'));
            const videos = selectedMediaFiles.filter(f => f.type.startsWith('video/'));

            if (file.type.startsWith('image/')) {
                if (images.length >= 5) {
                    alert('Bạn chỉ có thể chọn tối đa 5 hình ảnh.');
                    return;
                }
            } else if (file.type.startsWith('video/')) {
                if (videos.length >= 1) {
                    alert('Bạn chỉ có thể chọn tối đa 1 video.');
                    return;
                }
            } else {
                alert('Định dạng tệp không được hỗ trợ.');
                return;
            }

            selectedMediaFiles.push(file);
        });

        fileInput.value = '';
        renderMediaPreviews();
    });
}

function renderMediaPreviews() {
    const mediaGrid = document.getElementById('media-grid');
    if (!mediaGrid) return;

    const trigger = mediaGrid.querySelector('label');
    mediaGrid.innerHTML = '';
    mediaGrid.appendChild(trigger);

    selectedMediaFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'relative aspect-square rounded overflow-hidden border border-outline-variant/30 group bg-surface-container';

            if (file.type.startsWith('image/')) {
                previewItem.innerHTML = `
                    <img class="w-full h-full object-cover" src="${e.target.result}" alt="Preview" />
                    <button type="button" onclick="removeMedia(${index})" class="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100">
                        <span class="material-symbols-outlined text-xs" style="font-size: 16px;">close</span>
                    </button>
                `;
            } else {
                previewItem.innerHTML = `
                    <video class="w-full h-full object-cover" src="${e.target.result}" muted></video>
                    <div class="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                        <span class="material-symbols-outlined text-white text-2xl">play_circle</span>
                    </div>
                    <button type="button" onclick="removeMedia(${index})" class="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100">
                        <span class="material-symbols-outlined text-xs" style="font-size: 16px;">close</span>
                    </button>
                `;
            }
            mediaGrid.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
}

function removeMedia(index) {
    selectedMediaFiles.splice(index, 1);
    renderMediaPreviews();
}

window.removeMedia = removeMedia;

// --- Lưu hình ảnh đánh giá vào localStorage ---
async function saveReviewImagesLocally(productId) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userName = user.ten || 'Khách hàng';
    
    // Đọc tất cả hình ảnh/video sang định dạng Base64
    const base64Promises = selectedMediaFiles.map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    });

    const base64s = await Promise.all(base64Promises);
    if (base64s.length > 0) {
        const key = `review_images_${productId}_${userName}`;
        localStorage.setItem(key, JSON.stringify(base64s));
    }
}
