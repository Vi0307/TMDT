// Dữ liệu mẫu đánh giá
let reviews = [
    { 
        id: "DG001", 
        user: "Nguyen Van A", 
        product: "Đèn lồng Hội An", 
        stars: 5, 
        content: "Sản phẩm rất đẹp, đóng gói cẩn thận. Rất đậm chất Hội An!",
        status: "Chưa phản hồi",
        replyTitle: "",
        replyContent: ""
    },
    { 
        id: "DG002", 
        user: "Tran Thi B", 
        product: "Cao lầu Hội An", 
        stars: 4, 
        content: "Ăn cũng ngon nhưng hơi ít nước dùng.",
        status: "Đã phản hồi",
        replyTitle: "Cảm ơn góp ý",
        replyContent: "Cảm ơn bạn đã phản hồi. Chúng tôi sẽ ghi nhận và cải thiện định lượng cho phần ăn sau!"
    },
    { 
        id: "DG003", 
        user: "Le Van C", 
        product: "Tượng gỗ Kim Bồng", 
        stars: 5, 
        content: "Chạm khắc rất tinh xảo, tôi rất thích.",
        status: "Chưa phản hồi",
        replyTitle: "",
        replyContent: ""
    }
];

const reviewTableBody = document.getElementById('reviewTableBody');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');

// Hàm tạo HTML cho số sao
function getStarsHtml(stars) {
    let html = '<div class="stars">';
    for (let i = 1; i <= 5; i++) {
        if (i <= stars) {
            html += '<i class="ph-fill ph-star ph-star-fill"></i>';
        } else {
            html += '<i class="ph ph-star"></i>';
        }
    }
    html += '</div>';
    return html;
}

// Hàm render bảng dữ liệu
function renderTable(data) {
    reviewTableBody.innerHTML = '';
    
    if (data.length === 0) {
        reviewTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 40px; color:#A0AEC0; font-size: 15px;">Không tìm thấy đánh giá nào.</td></tr>`;
        return;
    }

    data.forEach(review => {
        const statusClass = review.status === 'Đã phản hồi' ? 'status-active' : 'status-locked';
        
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td><strong>${review.id}</strong></td>
            <td>${review.user}</td>
            <td>${review.product}</td>
            <td>${getStarsHtml(review.stars)}</td>
            <td><div class="review-content">${review.content}</div></td>
            <td><span class="status-badge ${statusClass}">${review.status}</span></td>
            <td class="actions">
                <button class="btn-action btn-reply" onclick="replyReview('${review.id}')" title="${review.status === 'Đã phản hồi' ? 'Xem/Sửa phản hồi' : 'Viết phản hồi'}">
                    <i class="ph ${review.status === 'Đã phản hồi' ? 'ph-eye' : 'ph-chat-teardrop-text'}"></i>
                </button>
            </td>
        `;
        
        reviewTableBody.appendChild(tr);
    });
}

// Popup Form Layout cho Phản hồi
function getReplyFormHtml(review) {
    return `
        <div style="text-align: left; padding: 10px 0;">
            <div class="review-detail-box">
                <p><strong>Khách hàng:</strong> ${review.user}</p>
                <p><strong>Sản phẩm:</strong> ${review.product}</p>
                <p><strong>Đánh giá:</strong> ${getStarsHtml(review.stars)}</p>
                <p><strong>Nội dung:</strong> ${review.content}</p>
            </div>
            <div style="margin-bottom: 20px;">
                <label for="swal-input-title" style="display: block; font-size: 15px; font-weight: 600; color: #2D3748; margin-bottom: 8px;">Tiêu đề phản hồi <span style="color:#E53E3E">*</span></label>
                <input id="swal-input-title" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; font-size: 15px; border-radius: 10px;" placeholder="Ví dụ: Cảm ơn bạn đã mua hàng..." value="${review.replyTitle || 'Phản hồi từ cửa hàng'}">
            </div>
            <div style="margin-bottom: 8px;">
                <label for="swal-input-content" style="display: block; font-size: 15px; font-weight: 600; color: #2D3748; margin-bottom: 8px;">Nội dung phản hồi <span style="color:#E53E3E">*</span></label>
                <textarea id="swal-input-content" class="swal2-textarea" style="width: 100%; margin: 0; box-sizing: border-box; font-size: 15px; border-radius: 10px; height: 120px;" placeholder="Nhập nội dung phản hồi...">${review.replyContent || ''}</textarea>
            </div>
        </div>
    `;
}

// Validator cho form
function validateReplyForm() {
    const title = document.getElementById('swal-input-title').value.trim();
    const content = document.getElementById('swal-input-content').value.trim();
    
    if (!title) return Swal.showValidationMessage('Bạn cần nhập tiêu đề phản hồi!');
    if (!content) return Swal.showValidationMessage('Bạn cần nhập nội dung phản hồi!');
    
    return { title, content };
}

// Hàm xử lý phản hồi
async function replyReview(reviewId) {
    const index = reviews.findIndex(r => r.id === reviewId);
    if (index !== -1) {
        const review = reviews[index];
        const isEditing = review.status === 'Đã phản hồi';
        
        const { value: formValues } = await Swal.fire({
            title: isEditing ? 'Chỉnh sửa phản hồi' : 'Viết phản hồi',
            html: getReplyFormHtml(review),
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#5C4033',
            cancelButtonColor: '#A0AEC0',
            confirmButtonText: 'Gửi phản hồi',
            cancelButtonText: 'Đóng',
            width: 600,
            preConfirm: validateReplyForm
        });

        if (formValues) {
            reviews[index].replyTitle = formValues.title;
            reviews[index].replyContent = formValues.content;
            reviews[index].status = 'Đã phản hồi';
            
            filterAndRender();
            
            Swal.fire({
                title: 'Thành công!',
                text: 'Đã gửi phản hồi đánh giá.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        }
    }
}

// Hàm đăng xuất
function confirmLogout() {
    Swal.fire({
        title: 'Đăng xuất?',
        text: "Bạn có muốn đăng xuất khỏi phiên làm việc này?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#5C4033',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Đăng xuất',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Thành công',
                text: 'Đã đăng xuất.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        }
    });
}

// Hàm xử lý Lọc & Tìm kiếm
function filterAndRender() {
    const keyword = searchInput.value.toLowerCase();
    const status = statusFilter.value;
    
    const filteredReviews = reviews.filter(r => {
        const matchKeyword = r.user.toLowerCase().includes(keyword) || 
                             r.id.toLowerCase().includes(keyword) ||
                             r.product.toLowerCase().includes(keyword) ||
                             r.content.toLowerCase().includes(keyword);
        const matchStatus = status === 'all' || r.status === status;
        
        return matchKeyword && matchStatus;
    });
    
    renderTable(filteredReviews);
}

searchInput.addEventListener('input', filterAndRender);
statusFilter.addEventListener('change', filterAndRender);

// Render dữ liệu ban đầu
document.addEventListener('DOMContentLoaded', () => {
    renderTable(reviews);
});
