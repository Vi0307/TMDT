const API_URL = 'http://localhost:3000/api/admin/receipts';

const receiptTableBody = document.getElementById('receiptTableBody');
const searchInput = document.getElementById('searchInput');

// Lấy danh sách phiếu nhập
async function loadReceipts(search = '') {
    receiptTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:40px;color:#A0AEC0;">Đang tải...</td></tr>`;
    try {
        const url = search ? `${API_URL}?search=${encodeURIComponent(search)}` : API_URL;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.success) {
            renderTable(json.data);
        } else {
            receiptTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:red;padding:40px;">Lỗi: ${json.message}</td></tr>`;
        }
    } catch (err) {
        console.error('loadReceipts error:', err);
        receiptTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:red;padding:40px;">Không thể kết nối server. (${err.message})</td></tr>`;
    }
}

// Lấy danh sách nhà cung cấp cho dropdown
async function fetchSuppliers() {
    try {
        const res = await fetch(`${API_URL}/suppliers`);
        const json = await res.json();
        return json.success ? json.data : [];
    } catch {
        return [];
    }
}

// Render bảng
function renderTable(data) {
    receiptTableBody.innerHTML = '';

    if (data.length === 0) {
        receiptTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:40px;color:#A0AEC0;">Không tìm thấy phiếu nhập nào.</td></tr>`;
        return;
    }

    data.forEach(r => {
        const ngay = r.ngayNhap ? new Date(r.ngayNhap).toLocaleDateString('vi-VN') : '';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${r.maPhieuNhap}</strong></td>
            <td>${r.tenNCC || r.maNCC}</td>
            <td>
                <div class="contact-info">
                    <div class="contact-info-item"><i class="ph ph-calendar-blank"></i> ${ngay}</div>
                </div>
            </td>
            <td class="actions">
                <button class="btn-action btn-edit" onclick="editReceipt(${r.maPhieuNhap}, ${r.maNCC}, '${r.ngayNhap ? r.ngayNhap.split('T')[0] : ''}')" title="Sửa thông tin">
                    <i class="ph ph-pencil-simple"></i>
                </button>
                <button class="btn-action btn-delete" onclick="deleteReceipt(${r.maPhieuNhap})" title="Xóa phiếu nhập">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        receiptTableBody.appendChild(tr);
    });
}

// Tạo HTML dropdown NCC
function buildSupplierOptions(suppliers, selectedId = null) {
    return suppliers.map(s =>
        `<option value="${s.maNCC}" ${s.maNCC == selectedId ? 'selected' : ''}>${s.tenNCC}</option>`
    ).join('');
}

// Thêm phiếu nhập
async function addReceipt() {
    const suppliers = await fetchSuppliers();
    if (suppliers.length === 0) {
        Swal.fire({ title: 'Lỗi!', text: 'Không thể tải danh sách nhà cung cấp.', icon: 'error' });
        return;
    }

    const { value: formValues } = await Swal.fire({
        title: 'Thêm phiếu nhập mới',
        html: `
            <div style="text-align:left;padding:10px 0;">
                <div style="margin-bottom:20px;">
                    <label style="display:block;font-size:15px;font-weight:600;color:#2D3748;margin-bottom:8px;">
                        Nhà cung cấp <span style="color:#E53E3E">*</span>
                    </label>
                    <select id="swal-ncc" class="swal2-input" style="width:100%;margin:0;box-sizing:border-box;font-size:15px;border-radius:10px;height:46px;">
                        <option value="">-- Chọn nhà cung cấp --</option>
                        ${buildSupplierOptions(suppliers)}
                    </select>
                </div>
                <div>
                    <label style="display:block;font-size:15px;font-weight:600;color:#2D3748;margin-bottom:8px;">
                        Ngày nhập <span style="color:#E53E3E">*</span>
                    </label>
                    <input id="swal-date" type="date" class="swal2-input" style="width:100%;margin:0;box-sizing:border-box;font-size:15px;border-radius:10px;">
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#5C4033',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Thêm mới',
        cancelButtonText: 'Hủy bỏ',
        preConfirm: () => {
            const maNCC = document.getElementById('swal-ncc').value;
            const ngayNhap = document.getElementById('swal-date').value;
            if (!maNCC) return Swal.showValidationMessage('Bạn cần chọn nhà cung cấp!');
            if (!ngayNhap) return Swal.showValidationMessage('Bạn cần chọn ngày nhập!');
            return { maNCC: parseInt(maNCC), ngayNhap };
        }
    });

    if (!formValues) return;

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formValues)
        });
        const json = await res.json();
        if (json.success) {
            Swal.fire({ title: 'Thành công!', text: 'Đã thêm phiếu nhập mới.', icon: 'success', timer: 1500, showConfirmButton: false });
            loadReceipts(searchInput.value);
        } else {
            Swal.fire({ title: 'Lỗi!', text: json.message, icon: 'error' });
        }
    } catch {
        Swal.fire({ title: 'Lỗi!', text: 'Không thể kết nối server.', icon: 'error' });
    }
}

// Sửa phiếu nhập
async function editReceipt(id, currentNCC, currentDate) {
    const suppliers = await fetchSuppliers();
    if (suppliers.length === 0) {
        Swal.fire({ title: 'Lỗi!', text: 'Không thể tải danh sách nhà cung cấp.', icon: 'error' });
        return;
    }

    const { value: formValues } = await Swal.fire({
        title: 'Sửa thông tin phiếu nhập',
        html: `
            <div style="text-align:left;padding:10px 0;">
                <div style="margin-bottom:20px;">
                    <label style="display:block;font-size:15px;font-weight:600;color:#2D3748;margin-bottom:8px;">
                        Nhà cung cấp <span style="color:#E53E3E">*</span>
                    </label>
                    <select id="swal-ncc" class="swal2-input" style="width:100%;margin:0;box-sizing:border-box;font-size:15px;border-radius:10px;height:46px;">
                        ${buildSupplierOptions(suppliers, currentNCC)}
                    </select>
                </div>
                <div>
                    <label style="display:block;font-size:15px;font-weight:600;color:#2D3748;margin-bottom:8px;">
                        Ngày nhập <span style="color:#E53E3E">*</span>
                    </label>
                    <input id="swal-date" type="date" class="swal2-input" style="width:100%;margin:0;box-sizing:border-box;font-size:15px;border-radius:10px;" value="${currentDate}">
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#3182CE',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Cập nhật',
        cancelButtonText: 'Hủy bỏ',
        preConfirm: () => {
            const maNCC = document.getElementById('swal-ncc').value;
            const ngayNhap = document.getElementById('swal-date').value;
            if (!maNCC) return Swal.showValidationMessage('Bạn cần chọn nhà cung cấp!');
            if (!ngayNhap) return Swal.showValidationMessage('Bạn cần chọn ngày nhập!');
            return { maNCC: parseInt(maNCC), ngayNhap };
        }
    });

    if (!formValues) return;

    try {
        const res = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formValues)
        });
        const json = await res.json();
        if (json.success) {
            Swal.fire({ title: 'Đã cập nhật!', text: 'Thông tin phiếu nhập đã được lưu lại.', icon: 'success', timer: 1500, showConfirmButton: false });
            loadReceipts(searchInput.value);
        } else {
            Swal.fire({ title: 'Lỗi!', text: json.message, icon: 'error' });
        }
    } catch {
        Swal.fire({ title: 'Lỗi!', text: 'Không thể kết nối server.', icon: 'error' });
    }
}

// Xóa phiếu nhập
function deleteReceipt(id) {
    Swal.fire({
        title: 'Xóa phiếu nhập?',
        text: `Phiếu nhập #${id} và chi tiết sẽ bị xóa vĩnh viễn!`,
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#E53E3E',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Hủy bỏ'
    }).then(async (result) => {
        if (!result.isConfirmed) return;
        try {
            const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                Swal.fire({ title: 'Đã xóa!', text: 'Phiếu nhập đã bị xóa khỏi hệ thống.', icon: 'success', timer: 1500, showConfirmButton: false });
                loadReceipts(searchInput.value);
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

// Tìm kiếm debounce
let searchTimeout;
searchInput.addEventListener('input', function () {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadReceipts(this.value), 300);
});

document.addEventListener('DOMContentLoaded', () => loadReceipts());
