const API_URL = 'http://localhost:3005/api/admin/returns';

const returnTableBody = document.getElementById('returnTableBody');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');

let allReturns = [];

// Render bảng
function renderTable(data) {
    returnTableBody.innerHTML = '';

    if (data.length === 0) {
        returnTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#A0AEC0;">Không tìm thấy yêu cầu hoàn hàng nào.</td></tr>`;
        return;
    }

    data.forEach((req, index) => {
        let statusClass = '';
        if (req.tenTrangThai === 'Đã duyệt hoàn') statusClass = 'status-active';
        else if (req.tenTrangThai === 'Từ chối hoàn') statusClass = 'status-locked';
        else statusClass = 'status-pending';

        let actionsHtml = `
            <button class="btn-action btn-view" onclick="viewReturn(${req.maYeuCau})" title="Xem chi tiết">
                <i class="ph ph-eye"></i>
            </button>
        `;

        if (req.tenTrangThai === 'Chờ duyệt hoàn') {
            actionsHtml += `
                <button class="btn-action btn-approve" onclick="approveReturn(${req.maYeuCau})" title="Xác nhận hoàn">
                    <i class="ph ph-check-circle"></i>
                </button>
                <button class="btn-action btn-reject" onclick="rejectReturn(${req.maYeuCau})" title="Từ chối">
                    <i class="ph ph-x-circle"></i>
                </button>
            `;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${index + 1}</strong></td>
            <td>${req.tenKhachHang || ''}</td>
            <td>${req.lyDo || ''}</td>
            <td><span class="status-badge ${statusClass}">${req.tenTrangThai}</span></td>
            <td class="actions">${actionsHtml}</td>
        `;
        returnTableBody.appendChild(tr);
    });
}

// Tải dữ liệu
async function loadReturns() {
    returnTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#A0AEC0;">Đang tải...</td></tr>`;
    try {
        const res = await fetch(API_URL);
        const json = await res.json();
        if (json.success) {
            allReturns = json.data;
            filterAndRender();
        } else {
            returnTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:red;padding:40px;">Lỗi: ${json.message}</td></tr>`;
        }
    } catch (err) {
        console.error('loadReturns error:', err);
        returnTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:red;padding:40px;">Lỗi: ${err.message}</td></tr>`;
    }
}

// Xem chi tiết
async function viewReturn(maYeuCau) {
    try {
        const res = await fetch(`http://localhost:3005/api/admin/returns/${maYeuCau}`);
        const json = await res.json();
        
        if (!json.success) {
            Swal.fire('Lỗi!', json.message || 'Không thể lấy thông tin chi tiết.', 'error');
            return;
        }

        const req = json.data;
        const ngay = req.ngayYeuCau ? new Date(req.ngayYeuCau).toLocaleDateString('vi-VN') : '—';

        // Render danh sách sản phẩm thành các hàng bảng
        let productsHtml = '';
        if (req.sanPham && req.sanPham.length > 0) {
            productsHtml = req.sanPham.map(sp => {
                const dongia = Number(sp.gia).toLocaleString('vi-VN') + ' đ';
                const thanhtien = (Number(sp.gia) * Number(sp.soLuong)).toLocaleString('vi-VN') + ' đ';
                return `
                    <tr>
                        <td style="text-align: left;"><strong>${sp.tenSanPham}</strong></td>
                        <td style="text-align: center;">${sp.soLuong}</td>
                        <td style="text-align: right;">${dongia}</td>
                        <td style="text-align: right; color:#B52424; font-weight:700;">${thanhtien}</td>
                    </tr>
                `;
            }).join('');
        } else {
            productsHtml = `<tr><td colspan="4" style="text-align:center;color:#A0AEC0;padding:16px;">Không có sản phẩm nào</td></tr>`;
        }

        const isPending = req.tenTrangThai === 'Chờ duyệt hoàn';
        
        Swal.fire({
            html: `
                <div class="hoan-modal">
                    <!-- Header -->
                    <div class="hoan-header">
                        <h3 class="hoan-title">Chi tiết đơn hoàn hàng - <span>DH00${req.maDonHang}</span></h3>
                    </div>
                    
                    <!-- Thông tin khách hàng -->
                    <div class="hoan-section">
                        <h4 class="section-title"><i class="ph ph-user-circle"></i> Thông tin khách hàng</h4>
                        <div class="section-card hoan-grid-2">
                            <div>
                                <p class="info-label">Họ và tên</p>
                                <p class="info-value">${req.tenKhachHang || 'Khách hàng'}</p>
                            </div>
                            <div>
                                <p class="info-label">Số điện thoại</p>
                                <p class="info-value"><i class="ph ph-phone text-stone-400"></i> ${req.soDienThoai || '—'}</p>
                            </div>
                            <div style="grid-column: span 2; margin-top: 10px;">
                                <p class="info-label">Email</p>
                                <p class="info-value"><i class="ph ph-envelope text-stone-400"></i> ${req.email || '—'}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Thông tin sản phẩm -->
                    <div class="hoan-section">
                        <h4 class="section-title"><i class="ph ph-package"></i> Thông tin sản phẩm</h4>
                        <div class="section-card" style="padding: 0; overflow: hidden;">
                            <table class="hoan-table">
                                <thead>
                                    <tr>
                                        <th style="width: 45%; text-align: left;">Sản phẩm</th>
                                        <th style="width: 15%; text-align: center;">Số lượng</th>
                                        <th style="width: 20%; text-align: right;">Đơn giá</th>
                                        <th style="width: 20%; text-align: right;">Thành tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${productsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Thẻ lí do & phương thức hoàn tiền -->
                    <div class="hoan-flex-2">
                        <div class="reason-card">
                            <h5 class="card-title"><i class="ph ph-info"></i> Lí do hoàn hàng</h5>
                            <p class="card-desc">${req.lyDo || '—'}</p>
                        </div>
                        <div class="refund-card">
                            <h5 class="card-title"><i class="ph ph-credit-card"></i> Phương thức hoàn tiền</h5>
                            <p class="card-desc">${req.phuongThuc || 'Ví điện tử MOMO / Số dư'}</p>
                        </div>
                    </div>
                </div>
            `,
            showCancelButton: isPending,
            showDenyButton: isPending,
            confirmButtonText: isPending ? 'Xác nhận hoàn hàng' : 'Đóng',
            cancelButtonText: 'Hủy',
            denyButtonText: 'Từ chối hoàn',
            
            customClass: {
                popup: 'hoan-swal-popup',
                htmlContainer: 'hoan-swal-html',
                actions: 'hoan-swal-actions',
                confirmButton: 'hoan-swal-confirm',
                cancelButton: 'hoan-swal-cancel',
                denyButton: 'swal2-deny hoan-swal-deny'
            },
            buttonsStyling: false,
            width: 760
        }).then((result) => {
            if (result.isConfirmed && isPending) {
                approveReturn(maYeuCau);
            } else if (result.isDenied && isPending) {
                rejectReturn(maYeuCau);
            }
        });

    } catch (err) {
        console.error('viewReturn error:', err);
        Swal.fire('Lỗi!', 'Không thể kết nối đến máy chủ.', 'error');
    }
}

// Xác nhận hoàn hàng
function approveReturn(maYeuCau) {
    Swal.fire({
        title: 'Xác nhận hoàn hàng?',
        text: 'Bạn có chắc chắn muốn XÁC NHẬN yêu cầu hoàn hàng này?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#38A169',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Xác nhận',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (!result.isConfirmed) return;
        try {
            const res = await fetch(`${API_URL}/${maYeuCau}/approve`, { method: 'PUT' });
            const json = await res.json();
            if (json.success) {
                Swal.fire({ title: 'Thành công!', text: 'Đã xác nhận hoàn hàng thành công.', icon: 'success', timer: 1500, showConfirmButton: false });
                loadReturns();
            } else {
                Swal.fire({ title: 'Lỗi!', text: json.message, icon: 'error' });
            }
        } catch {
            Swal.fire({ title: 'Lỗi!', text: 'Không thể kết nối server.', icon: 'error' });
        }
    });
}

// Từ chối hoàn hàng
function rejectReturn(maYeuCau) {
    Swal.fire({
        title: 'Từ chối hoàn hàng?',
        text: 'Bạn có chắc chắn muốn TỪ CHỐI yêu cầu hoàn hàng này?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#E53E3E',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Từ chối',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (!result.isConfirmed) return;
        try {
            const res = await fetch(`${API_URL}/${maYeuCau}/reject`, { method: 'PUT' });
            const json = await res.json();
            if (json.success) {
                Swal.fire({ title: 'Đã từ chối!', text: 'Yêu cầu hoàn hàng đã bị từ chối.', icon: 'info', timer: 1500, showConfirmButton: false });
                loadReturns();
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
        confirmButtonColor: '#E53E3E',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Đăng xuất',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('token');
            localStorage.removeItem('adminToken');
            sessionStorage.clear();
            window.location.href = '../../fe/dangnhap.html';
        }
    });
}

// Lọc & tìm kiếm — map option HTML sang tên DB
const STATUS_FILTER_MAP = {
    'Chờ xác nhận': 'Chờ duyệt hoàn',
    'Đã hoàn': 'Đã duyệt hoàn',
    'Từ chối': 'Từ chối hoàn'
};

function filterAndRender() {
    const keyword = searchInput.value.toLowerCase();
    const rawStatus = statusFilter.value;
    const status = STATUS_FILTER_MAP[rawStatus] || rawStatus; // map hoặc giữ nguyên 'all'

    const filtered = allReturns.filter(r => {
        const matchKeyword =
            (r.tenKhachHang || '').toLowerCase().includes(keyword) ||
            String(r.maDonHang).includes(keyword) ||
            (r.lyDo || '').toLowerCase().includes(keyword);
        const matchStatus = status === 'all' || r.tenTrangThai === status;
        return matchKeyword && matchStatus;
    });

    renderTable(filtered);
}

let searchTimeout;
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(filterAndRender, 300);
});
statusFilter.addEventListener('change', filterAndRender);

document.addEventListener('DOMContentLoaded', () => loadReturns());
