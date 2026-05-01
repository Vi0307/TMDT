const API_URL = 'http://localhost:3000/api/admin/reviews';

const reviewTableBody = document.getElementById('reviewTableBody');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');

let allReviews = [];

// Render sao
function getStarsHtml(stars) {
    let html = '<div class="stars">';
    for (let i = 1; i <= 5; i++) {
        html += i <= stars
            ? '<i class="ph-fill ph-star ph-star-fill"></i>'
            : '<i class="ph ph-star"></i>';
    }
    return html + '</div>';
}

// Render bảng
function renderTable(data) {
    reviewTableBody.innerHTML = '';

    if (data.length === 0) {
        reviewTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#A0AEC0;">Không tìm thấy đánh giá nào.</td></tr>`;
        return;
    }

    data.forEach(review => {
        const statusClass = review.trangThai === 'Đã phản hồi' ? 'status-active' : 'status-locked';
        const btnIcon = review.trangThai === 'Đã phản hồi' ? 'ph-eye' : 'ph-chat-teardrop-text';
        const btnTitle = review.trangThai === 'Đã phản hồi' ? 'Xem/Sửa phản hồi' : 'Viết phản hồi';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${review.maDanhGia}</strong></td>
            <td>${review.tenKhachHang || ''}</td>
            <td>${review.tenSanPham || ''}</td>
            <td>${getStarsHtml(review.soSao)}</td>
            <td><div class="review-content">${review.binhLuan || ''}</div></td>
            <td><span class="status-badge ${statusClass}">${review.trangThai}</span></td>
            <td class="actions">
                <button class="btn-action btn-reply"
                    onclick="replyReview(${review.maDanhGia}, ${review.maPhanHoi || 'null'}, '${escapeAttr(review.tieuDePhanHoi)}', '${escapeAttr(review.noiDungPhanHoi)}')"
                    title="${btnTitle}">
                    <i class="ph ${btnIcon}"></i>
                </button>
            </td>
        `;
        reviewTableBody.appendChild(tr);
    });
}

function escapeAttr(str) {
    return (str || '').replace(/'/g, "\\'").replace(/\n/g, ' ');
}

// Tải dữ liệu
async function loadReviews() {
    reviewTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#A0AEC0;">Đang tải...</td></tr>`;
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.success) {
            allReviews = json.data;
            filterAndRender();
        } else {
            reviewTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;padding:40px;">Lỗi: ${json.message}</td></tr>`;
        }
    } catch (err) {
        console.error('loadReviews error:', err);
        reviewTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;padding:40px;">Không thể kết nối server. (${err.message})</td></tr>`;
    }
}

// Phản hồi / Sửa phản hồi
async function replyReview(maDanhGia, maPhanHoi, currentTitle, currentContent) {
    const isEditing = !!maPhanHoi;
    const review = allReviews.find(r => r.maDanhGia === maDanhGia);
    if (!review) return;

    const { value: formValues } = await Swal.fire({
        title: isEditing ? 'Chỉnh sửa phản hồi' : 'Viết phản hồi',
        html: `
            <div style="text-align:left;padding:10px 0;">
                <div class="review-detail-box" style="background:#F7FAFC;border-radius:10px;padding:12px 16px;margin-bottom:20px;font-size:14px;color:#4A5568;">
                    <p><strong>Khách hàng:</strong> ${review.tenKhachHang}</p>
                    <p><strong>Sản phẩm:</strong> ${review.tenSanPham}</p>
                    <p><strong>Đánh giá:</strong> ${getStarsHtml(review.soSao)}</p>
                    <p><strong>Nội dung:</strong> ${review.binhLuan}</p>
                </div>
                <div style="margin-bottom:16px;">
                    <label style="display:block;font-size:15px;font-weight:600;color:#2D3748;margin-bottom:8px;">
                        Tiêu đề phản hồi <span style="color:#E53E3E">*</span>
                    </label>
                    <input id="swal-input-title" class="swal2-input" style="width:100%;margin:0;box-sizing:border-box;font-size:15px;border-radius:10px;"
                        placeholder="Ví dụ: Cảm ơn bạn đã mua hàng..." value="${currentTitle || 'Phản hồi từ cửa hàng'}">
                </div>
                <div>
                    <label style="display:block;font-size:15px;font-weight:600;color:#2D3748;margin-bottom:8px;">
                        Nội dung phản hồi <span style="color:#E53E3E">*</span>
                    </label>
                    <textarea id="swal-input-content" class="swal2-textarea" style="width:100%;margin:0;box-sizing:border-box;font-size:15px;border-radius:10px;height:120px;"
                        placeholder="Nhập nội dung phản hồi...">${currentContent || ''}</textarea>
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#5C4033',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Gửi phản hồi',
        cancelButtonText: 'Đóng',
        width: 600,
        preConfirm: () => {
            const tieuDe = document.getElementById('swal-input-title').value.trim();
            const noiDung = document.getElementById('swal-input-content').value.trim();
            if (!tieuDe) return Swal.showValidationMessage('Bạn cần nhập tiêu đề phản hồi!');
            if (!noiDung) return Swal.showValidationMessage('Bạn cần nhập nội dung phản hồi!');
            return { tieuDe, noiDung };
        }
    });

    if (!formValues) return;

    try {
        let res;
        if (isEditing) {
            res = await fetch(`${API_URL}/reply/${maPhanHoi}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formValues)
            });
        } else {
            res = await fetch(`${API_URL}/${maDanhGia}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formValues)
            });
        }

        const json = await res.json();
        if (json.success) {
            Swal.fire({ title: 'Thành công!', text: 'Đã gửi phản hồi đánh giá.', icon: 'success', timer: 1500, showConfirmButton: false });
            loadReviews();
        } else {
            Swal.fire({ title: 'Lỗi!', text: json.message, icon: 'error' });
        }
    } catch {
        Swal.fire({ title: 'Lỗi!', text: 'Không thể kết nối server.', icon: 'error' });
    }
}

// Lọc & tìm kiếm
function filterAndRender() {
    const keyword = searchInput.value.toLowerCase();
    const status = statusFilter.value;

    const filtered = allReviews.filter(r => {
        const matchKeyword =
            (r.tenKhachHang || '').toLowerCase().includes(keyword) ||
            (r.tenSanPham || '').toLowerCase().includes(keyword) ||
            (r.binhLuan || '').toLowerCase().includes(keyword) ||
            String(r.maDanhGia).includes(keyword);
        const matchStatus = status === 'all' || r.trangThai === status;
        return matchKeyword && matchStatus;
    });

    renderTable(filtered);
}

// Đăng xuất
function confirmLogout() {
    Swal.fire({
        title: 'Đăng xuất?',
        text: 'Bạn có muốn đăng xuất khỏi phiên làm việc này?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#5C4033',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Đăng xuất',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Thành công', text: 'Đã đăng xuất.', icon: 'success', timer: 1500, showConfirmButton: false });
        }
    });
}

let searchTimeout;
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(filterAndRender, 300);
});
statusFilter.addEventListener('change', filterAndRender);

document.addEventListener('DOMContentLoaded', () => loadReviews());
