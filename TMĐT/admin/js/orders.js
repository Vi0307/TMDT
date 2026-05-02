const API_URL = 'http://localhost:3000/api/admin/orders';

const orderTableBody = document.getElementById('orderTableBody');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');

let allOrders = [];
let filteredOrders = [];
let currentPage = 1;
const itemsPerPage = 5;

// Map trạng thái
function getStatusDisplay(status) {
    switch (status) {
        case 'processing': return { label: 'Chờ xác nhận', class: 'status-processing', icon: 'ph-clock' };
        case 'delivering': return { label: 'Đang giao', class: 'status-delivering', icon: 'ph-truck' };
        case 'delivered': return { label: 'Đã giao', class: 'status-delivered', icon: 'ph-check-circle' };
        case 'cancelled': return { label: 'Đã hủy', class: 'status-cancelled', icon: 'ph-x-circle' };
        default: return { label: 'Không xác định', class: '', icon: '' };
    }
}

// Cập nhật thẻ thống kê
function updateSummaryCards() {
    document.getElementById('totalOrders').textContent = allOrders.length;
    document.getElementById('processingOrders').textContent = allOrders.filter(o => o.status === 'processing').length;
    document.getElementById('deliveringOrders').textContent = allOrders.filter(o => o.status === 'delivering').length;
    document.getElementById('deliveredOrders').textContent = allOrders.filter(o => o.status === 'delivered').length;
}

// Render bảng với phân trang
function renderTable() {
    orderTableBody.innerHTML = '';

    const totalItems = filteredOrders.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

    document.getElementById('displayInfo').textContent =
        totalItems === 0 ? '0 - 0 / 0' : `${startIndex + 1} - ${endIndex} / ${totalItems}`;

    if (paginatedOrders.length === 0) {
        orderTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#A0AEC0;">Không tìm thấy đơn hàng nào.</td></tr>`;
        renderPagination(0);
        return;
    }

    paginatedOrders.forEach(order => {
        const statusInfo = getStatusDisplay(order.status);
        const tongTienFmt = Number(order.tongTien).toLocaleString('vi-VN') + ' đ';

        // Format ngày đặt
        let ngayDatFmt = '—';
        if (order.ngayDat) {
            const d = new Date(order.ngayDat);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            ngayDatFmt = `${day}/${month}/${year}`;
        }

        let actionHtml = '';
        if (order.status !== 'cancelled' && order.status !== 'delivered') {
            actionHtml += `<button class="btn-outline" onclick="updateOrderStatus(${order.maDonHang}, '${order.status}')">Cập nhật</button>`;
        }
        if (order.status === 'processing' || order.status === 'delivering') {
            actionHtml += `<button class="btn-danger" onclick="cancelOrder(${order.maDonHang})">Hủy đơn</button>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>#${order.maDonHang}</strong></td>
            <td>${order.tenKhachHang || ''}</td>
            <td>${order.soLuongSanPham} sản phẩm</td>
            <td><strong>${tongTienFmt}</strong></td>
            <td>
                <span class="status-badge ${statusInfo.class}" style="border-radius:20px;border:none !important;">
                    <i class="ph ${statusInfo.icon}"></i> ${statusInfo.label}
                </span>
            </td>
            <td>${ngayDatFmt}</td>
            <td><div class="table-actions">${actionHtml}</div></td>
        `;
        orderTableBody.appendChild(tr);
    });

    renderPagination(totalPages);
}

// Render phân trang
function renderPagination(totalPages) {
    const paginationControls = document.getElementById('paginationControls');
    paginationControls.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick = () => { currentPage = i; renderTable(); };
        paginationControls.appendChild(btn);
    }
}

// Tải dữ liệu từ API
async function loadOrders() {
    orderTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#A0AEC0;">Đang tải...</td></tr>`;
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.success) {
            allOrders = json.data;
            applyFilters();
            updateSummaryCards();
        } else {
            orderTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;padding:40px;">Lỗi: ${json.message}</td></tr>`;
        }
    } catch (err) {
        console.error('loadOrders error:', err);
        orderTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;padding:40px;">Không thể kết nối server. (${err.message})</td></tr>`;
    }
}

// Lọc dữ liệu
function applyFilters() {
    const keyword = searchInput.value.toLowerCase();
    const status = statusFilter.value;

    filteredOrders = allOrders.filter(order => {
        const matchKeyword = String(order.maDonHang).includes(keyword) ||
            (order.tenKhachHang || '').toLowerCase().includes(keyword);
        const matchStatus = status === 'all' || order.status === status;
        return matchKeyword && matchStatus;
    });

    currentPage = 1;
    renderTable();
}

// Cập nhật trạng thái
async function updateOrderStatus(orderId, currentStatus) {
    const { value: newStatus } = await Swal.fire({
        title: 'Cập nhật trạng thái',
        html: `
            <div style="text-align:left;padding:10px 0;">
                <label style="display:block;font-size:15px;font-weight:600;color:#2D3748;margin-bottom:8px;">Trạng thái mới</label>
                <select id="swal-status" class="swal2-input" style="width:100%;margin:0;box-sizing:border-box;font-size:15px;border-radius:10px;height:46px;">
                    <option value="processing" ${currentStatus === 'processing' ? 'selected' : ''}>Chờ xác nhận</option>
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
        preConfirm: () => document.getElementById('swal-status').value
    });

    if (!newStatus || newStatus === currentStatus) return;

    try {
        const res = await fetch(`${API_URL}/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const json = await res.json();
        if (json.success) {
            Swal.fire({ title: 'Thành công!', text: `Đã cập nhật trạng thái đơn #${orderId}.`, icon: 'success', timer: 1500, showConfirmButton: false });
            loadOrders();
        } else {
            Swal.fire({ title: 'Lỗi!', text: json.message, icon: 'error' });
        }
    } catch {
        Swal.fire({ title: 'Lỗi!', text: 'Không thể kết nối server.', icon: 'error' });
    }
}

// Hủy đơn hàng
function cancelOrder(orderId) {
    Swal.fire({
        title: 'Xác nhận hủy đơn?',
        text: `Bạn có chắc chắn muốn hủy đơn hàng #${orderId}? Hành động này không thể hoàn tác.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#E53E3E',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Hủy đơn hàng',
        cancelButtonText: 'Không'
    }).then(async (result) => {
        if (!result.isConfirmed) return;
        try {
            const res = await fetch(`${API_URL}/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'cancelled' })
            });
            const json = await res.json();
            if (json.success) {
                Swal.fire({ title: 'Đã hủy!', text: `Đơn hàng #${orderId} đã bị hủy.`, icon: 'success', timer: 1500, showConfirmButton: false });
                loadOrders();
            } else {
                Swal.fire({ title: 'Lỗi!', text: json.message, icon: 'error' });
            }
        } catch {
            Swal.fire({ title: 'Lỗi!', text: 'Không thể kết nối server.', icon: 'error' });
        }
    });
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

// Sự kiện tìm kiếm và lọc
let searchTimeout;
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(applyFilters, 300);
});
statusFilter.addEventListener('change', applyFilters);

document.addEventListener('DOMContentLoaded', () => loadOrders());
