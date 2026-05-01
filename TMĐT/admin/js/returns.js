const API_URL = 'http://localhost:3000/api/admin/returns';

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

    data.forEach(req => {
        let statusClass = '';
        if (req.trangThai === 'Đã hoàn') statusClass = 'status-active';
        else if (req.trangThai === 'Từ chối') statusClass = 'status-locked';
        else statusClass = 'status-pending';

        let actionsHtml = `
            <button class="btn-action btn-view" onclick="viewReturn(${req.maYeuCau})" title="Xem chi tiết">
                <i class="ph ph-eye"></i>
            </button>
        `;

        if (req.trangThai === 'Chờ xác nhận') {
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
            <td><strong>#${req.maDonHang}</strong></td>
            <td>${req.tenKhachHang || ''}</td>
            <td>${req.lyDo || ''}</td>
            <td><span class="status-badge ${statusClass}">${req.trangThai}</span></td>
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
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.success) {
            allReturns = json.data;
            filterAndRender();
        } else {
            returnTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:red;padding:40px;">Lỗi: ${json.message}</td></tr>`;
        }
    } catch (err) {
        console.error('loadReturns error:', err);
        returnTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:red;padding:40px;">Không thể kết nối server. (${err.message})</td></tr>`;
    }
}

// Xem chi tiết
function viewReturn(maYeuCau) {
    const req = allReturns.find(r => r.maYeuCau === maYeuCau);
    if (!req) return;

    const proofHtml = req.hinhAnh
        ? `<p><strong>Bằng chứng:</strong><br><img src="${req.hinhAnh}" class="proof-image" alt="Bằng chứng hoàn hàng" style="max-width:100%;border-radius:8px;margin-top:8px;" /></p>`
        : `<p><strong>Bằng chứng:</strong> Không có hình ảnh đính kèm.</p>`;

    Swal.fire({
        title: 'Chi tiết yêu cầu hoàn hàng',
        html: `
            <div class="return-detail-box" style="text-align:left;background:#F7FAFC;border-radius:10px;padding:16px;font-size:14px;color:#4A5568;">
                <p><strong>Mã Đơn:</strong> #${req.maDonHang}</p>
                <p><strong>Khách hàng:</strong> ${req.tenKhachHang || ''}</p>
                <p><strong>Lý do:</strong> ${req.lyDo || ''}</p>
                <p><strong>Chi tiết:</strong> ${req.chiTiet || ''}</p>
                ${proofHtml}
                <p><strong>Trạng thái:</strong> ${req.trangThai}</p>
            </div>
        `,
        confirmButtonColor: '#5C4033',
        confirmButtonText: 'Đóng',
        width: 600
    });
}

// Xác nhận hoàn hàng
function approveReturn(maYeuCau) {
    Swal.fire({
        title: 'Xác nhận hoàn hàng?',
        text: `Bạn có chắc chắn muốn XÁC NHẬN yêu cầu hoàn hàng này?`,
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
        text: `Bạn có chắc chắn muốn TỪ CHỐI yêu cầu hoàn hàng này?`,
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

// Lọc & tìm kiếm
function filterAndRender() {
    const keyword = searchInput.value.toLowerCase();
    const status = statusFilter.value;

    const filtered = allReturns.filter(r => {
        const matchKeyword =
            (r.tenKhachHang || '').toLowerCase().includes(keyword) ||
            String(r.maDonHang).includes(keyword) ||
            (r.lyDo || '').toLowerCase().includes(keyword) ||
            (r.chiTiet || '').toLowerCase().includes(keyword);
        const matchStatus = status === 'all' || r.trangThai === status;
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
