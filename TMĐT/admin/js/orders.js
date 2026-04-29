// Dữ liệu mẫu (Mock data) giống hệt thiết kế
let orders = [
    { id: "ORD-20231015-01", customer: "Nguyễn Văn A", products: 3, total: "2.450.000 đ", status: "processing", date: "15/10/2023 09:30" },
    { id: "ORD-20231015-02", customer: "Trần Thị B", products: 1, total: "950.000 đ", status: "delivering", date: "15/10/2023 10:15" },
    { id: "ORD-20231014-01", customer: "Lê Văn C", products: 3, total: "3.050.000 đ", status: "delivered", date: "14/10/2023 14:20" },
    { id: "ORD-20231014-02", customer: "Phạm Thị D", products: 3, total: "2.400.000 đ", status: "delivered", date: "14/10/2023 16:45" },
    { id: "ORD-20231016-01", customer: "Hoàng Văn E", products: 1, total: "850.000 đ", status: "processing", date: "16/10/2023 08:10" },
    { id: "ORD-20231016-02", customer: "Đặng Thị F", products: 2, total: "1.200.000 đ", status: "delivering", date: "16/10/2023 09:20" },
    { id: "ORD-20231017-01", customer: "Bùi Văn G", products: 5, total: "4.500.000 đ", status: "delivered", date: "17/10/2023 11:10" },
    { id: "ORD-20231017-02", customer: "Ngô Thị H", products: 1, total: "300.000 đ", status: "delivered", date: "17/10/2023 15:30" }
];

const orderTableBody = document.getElementById('orderTableBody');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');

// Phân trang
let currentPage = 1;
const itemsPerPage = 5;
let filteredOrders = [...orders];

// Hàm lấy thông tin hiển thị trạng thái
function getStatusDisplay(status) {
    switch (status) {
        case 'processing': return { label: 'Đang xử lý', class: 'status-processing', icon: 'ph-clock' };
        case 'delivering': return { label: 'Đang giao', class: 'status-delivering', icon: 'ph-truck' };
        case 'delivered': return { label: 'Đã giao', class: 'status-delivered', icon: 'ph-check-circle' };
        case 'cancelled': return { label: 'Đã hủy', class: 'status-cancelled', icon: 'ph-x-circle' };
        default: return { label: 'Không xác định', class: '', icon: '' };
    }
}

// Hàm cập nhật các thẻ thống kê
function updateSummaryCards() {
    document.getElementById('totalOrders').textContent = orders.length;
    document.getElementById('processingOrders').textContent = orders.filter(o => o.status === 'processing').length;
    document.getElementById('deliveringOrders').textContent = orders.filter(o => o.status === 'delivering').length;
    document.getElementById('deliveredOrders').textContent = orders.filter(o => o.status === 'delivered').length;
}

// Hàm render bảng dữ liệu
function renderTable() {
    orderTableBody.innerHTML = '';
    
    // Tính toán phân trang
    const totalItems = filteredOrders.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

    // Cập nhật text phân trang
    document.getElementById('displayInfo').textContent = totalItems === 0 ? "0 - 0 / 0" : `${startIndex + 1} - ${endIndex} / ${totalItems}`;

    if (paginatedOrders.length === 0) {
        orderTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 40px; color:#A0AEC0; font-size: 15px;">Không tìm thấy đơn hàng nào.</td></tr>`;
        renderPagination(0);
        return;
    }

    paginatedOrders.forEach(order => {
        const tr = document.createElement('tr');
        const statusInfo = getStatusDisplay(order.status);
        
        let actionHtml = `<button class="btn-outline" onclick="updateOrderStatus('${order.id}')">Cập nhật</button>`;
        if (order.status === 'processing' || order.status === 'delivering') {
            actionHtml += `<button class="btn-danger" onclick="cancelOrder('${order.id}')">Hủy đơn</button>`;
        }

        tr.innerHTML = `
            <td><strong>${order.id}</strong></td>
            <td>${order.customer}</td>
            <td>${order.products} sản phẩm</td>
            <td><strong>${order.total}</strong></td>
            <td>
                <span class="status-badge ${statusInfo.class}" style="border-radius: 20px; border: none !important;">
                    <i class="ph ${statusInfo.icon}"></i> ${statusInfo.label}
                </span>
            </td>
            <td>${order.date}</td>
            <td><div class="table-actions">${actionHtml}</div></td>
        `;
        
        orderTableBody.appendChild(tr);
    });

    renderPagination(totalPages);
}

// Hàm render nút phân trang
function renderPagination(totalPages) {
    const paginationControls = document.getElementById('paginationControls');
    paginationControls.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick = () => {
            currentPage = i;
            renderTable();
        };
        paginationControls.appendChild(btn);
    }
}

// Cập nhật trạng thái đơn hàng (Sử dụng SweetAlert2)
async function updateOrderStatus(orderId) {
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return;
    
    const currentStatus = orders[orderIndex].status;

    const { value: newStatus } = await Swal.fire({
        title: 'Cập nhật trạng thái',
        html: `
            <div style="text-align: left; padding: 10px 0;">
                <label style="display: block; font-size: 15px; font-weight: 600; color: #2D3748; margin-bottom: 8px;">Trạng thái mới</label>
                <select id="swal-status" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; font-size: 15px; border-radius: 10px;">
                    <option value="processing" ${currentStatus === 'processing' ? 'selected' : ''}>Đang xử lý</option>
                    <option value="delivering" ${currentStatus === 'delivering' ? 'selected' : ''}>Đang giao</option>
                    <option value="delivered" ${currentStatus === 'delivered' ? 'selected' : ''}>Đã giao</option>
                </select>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#3182CE',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Cập nhật',
        cancelButtonText: 'Hủy',
        preConfirm: () => {
            return document.getElementById('swal-status').value;
        }
    });

    if (newStatus && newStatus !== currentStatus) {
        orders[orderIndex].status = newStatus;
        applyFilters(); // Cập nhật lại list
        updateSummaryCards();
        
        Swal.fire({
            title: 'Thành công!',
            text: `Đã cập nhật trạng thái đơn hàng ${orderId}.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });
    }
}

// Hủy đơn hàng
function cancelOrder(orderId) {
    Swal.fire({
        title: 'Xác nhận hủy đơn?',
        text: `Bạn có chắc chắn muốn hủy đơn hàng ${orderId}? Hành động này không thể hoàn tác.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#E53E3E',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Hủy đơn hàng',
        cancelButtonText: 'Không'
    }).then((result) => {
        if (result.isConfirmed) {
            const orderIndex = orders.findIndex(o => o.id === orderId);
            if (orderIndex !== -1) {
                orders[orderIndex].status = 'cancelled';
                applyFilters();
                updateSummaryCards();
                
                Swal.fire({
                    title: 'Đã hủy!',
                    text: `Đơn hàng ${orderId} đã bị hủy.`,
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        }
    });
}

// Hàm lọc dữ liệu
function applyFilters() {
    const keyword = searchInput.value.toLowerCase();
    const status = statusFilter.value;

    filteredOrders = orders.filter(order => {
        const matchKeyword = order.id.toLowerCase().includes(keyword) || order.customer.toLowerCase().includes(keyword);
        const matchStatus = status === 'all' || order.status === status;
        return matchKeyword && matchStatus;
    });

    currentPage = 1; // Reset về trang 1 khi lọc
    renderTable();
}

// Sự kiện tìm kiếm và lọc
searchInput.addEventListener('input', applyFilters);
statusFilter.addEventListener('change', applyFilters);

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

// Render dữ liệu ban đầu
document.addEventListener('DOMContentLoaded', () => {
    updateSummaryCards();
    renderTable();
});
