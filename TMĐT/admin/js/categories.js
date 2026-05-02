const API_URL = 'http://localhost:3000/api/admin/categories';

const categoryTableBody = document.getElementById('categoryTableBody');
const searchInput = document.getElementById('searchInput');

// Lấy danh sách danh mục
async function loadCategories(search = '') {
    categoryTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:40px;color:#A0AEC0;">Đang tải...</td></tr>`;
    try {
        const url = search ? `${API_URL}?search=${encodeURIComponent(search)}` : API_URL;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.success) {
            renderTable(json.data);
        } else {
            categoryTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:red;padding:40px;">Lỗi: ${json.message}</td></tr>`;
        }
    } catch (err) {
        console.error('loadCategories error:', err);
        categoryTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:red;padding:40px;">Không thể kết nối server. (${err.message})</td></tr>`;
    }
}

// Render bảng
function renderTable(data) {
    categoryTableBody.innerHTML = '';

    if (data.length === 0) {
        categoryTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:40px;color:#A0AEC0;">Không tìm thấy danh mục nào.</td></tr>`;
        return;
    }

    data.forEach(cat => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${cat.maDanhMuc}</strong></td>
            <td>${cat.tenDanhMuc}</td>
            <td>
                <span class="status-badge" style="background-color:#EDF2F7;color:#4A5568;border:none;">
                    ${cat.soLuongSanPham} sản phẩm
                </span>
            </td>
            <td class="actions">
                <button class="btn-action btn-edit" onclick="editCategory(${cat.maDanhMuc}, '${cat.tenDanhMuc}')" title="Sửa danh mục">
                    <i class="ph ph-pencil-simple"></i>
                </button>
                <button class="btn-action btn-delete" onclick="deleteCategory(${cat.maDanhMuc}, '${cat.tenDanhMuc}', ${cat.soLuongSanPham})" title="Xóa danh mục">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        categoryTableBody.appendChild(tr);
    });
}

// Thêm danh mục
async function addCategory() {
    const { value: formValues } = await Swal.fire({
        title: 'Thêm danh mục mới',
        html: `
            <div style="text-align:left;padding:10px 0;">
                <label style="display:block;font-size:15px;font-weight:600;color:#2D3748;margin-bottom:8px;">
                    Tên danh mục <span style="color:#E53E3E">*</span>
                </label>
                <input id="swal-input1" class="swal2-input" style="width:100%;margin:0;box-sizing:border-box;font-size:15px;border-radius:10px;" placeholder="Ví dụ: Đồ thủ công mỹ nghệ...">
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#5C4033',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Thêm mới',
        cancelButtonText: 'Hủy bỏ',
        preConfirm: () => {
            const name = document.getElementById('swal-input1').value.trim();
            if (!name) {
                Swal.showValidationMessage('Bạn cần nhập tên danh mục!');
                return false;
            }
            return { tenDanhMuc: name };
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
            Swal.fire({ title: 'Thành công!', text: `Đã thêm danh mục "${formValues.tenDanhMuc}"`, icon: 'success', timer: 1500, showConfirmButton: false });
            loadCategories(searchInput.value);
        } else {
            Swal.fire({ title: 'Lỗi!', text: json.message, icon: 'error' });
        }
    } catch {
        Swal.fire({ title: 'Lỗi!', text: 'Không thể kết nối server.', icon: 'error' });
    }
}

// Sửa danh mục
async function editCategory(id, currentName) {
    const { value: formValues } = await Swal.fire({
        title: 'Sửa danh mục',
        html: `
            <div style="text-align:left;padding:10px 0;">
                <label style="display:block;font-size:15px;font-weight:600;color:#2D3748;margin-bottom:8px;">
                    Tên danh mục <span style="color:#E53E3E">*</span>
                </label>
                <input id="swal-input1" class="swal2-input" style="width:100%;margin:0;box-sizing:border-box;font-size:15px;border-radius:10px;" value="${currentName}">
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#3182CE',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Cập nhật',
        cancelButtonText: 'Hủy bỏ',
        preConfirm: () => {
            const name = document.getElementById('swal-input1').value.trim();
            if (!name) {
                Swal.showValidationMessage('Tên danh mục không được để trống!');
                return false;
            }
            return { tenDanhMuc: name };
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
            Swal.fire({ title: 'Đã cập nhật!', text: 'Thông tin danh mục đã được thay đổi.', icon: 'success', timer: 1500, showConfirmButton: false });
            loadCategories(searchInput.value);
        } else {
            Swal.fire({ title: 'Lỗi!', text: json.message, icon: 'error' });
        }
    } catch {
        Swal.fire({ title: 'Lỗi!', text: 'Không thể kết nối server.', icon: 'error' });
    }
}

// Xóa danh mục
function deleteCategory(id, name, productCount) {
    if (productCount > 0) {
        Swal.fire({
            title: 'Không thể xóa!',
            text: `Danh mục này đang có ${productCount} sản phẩm. Vui lòng chuyển hoặc xóa các sản phẩm trước.`,
            icon: 'warning',
            confirmButtonColor: '#5C4033'
        });
        return;
    }

    Swal.fire({
        title: 'Bạn có chắc chắn?',
        text: `Danh mục "${name}" sẽ bị xóa vĩnh viễn!`,
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
                Swal.fire({ title: 'Đã xóa!', text: 'Danh mục đã được xóa khỏi hệ thống.', icon: 'success', timer: 1500, showConfirmButton: false });
                loadCategories(searchInput.value);
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
    searchTimeout = setTimeout(() => loadCategories(this.value), 300);
});

document.addEventListener('DOMContentLoaded', () => loadCategories());
