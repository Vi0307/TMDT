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
                document.getElementById('product-img').src = `images/${p.hinhAnh}`;
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

            const res = await fetch(`${API_URL}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    maSanPham: productId,
                    soSao: selectedRating,
                    binhLuan: binhLuan
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
