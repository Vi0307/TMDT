const API_URL = 'http://localhost:3000/api/admin/products';
const API_CATEGORIES = 'http://localhost:3000/api/admin/categories';

const productTableBody = document.getElementById('productTableBody');
const searchInput = document.getElementById('searchInput');

let allCategories = [];

// Tải danh mục để dùng trong form
async function loadCategories() {
    try {
        const res = await fetch(API_CATEGORIES);
        const json = await res.json();
        if (json.success) allCategories = json.data;
    } catch {
        allCategories = [];
    }
}

// Render options danh mục
function renderCategoryOptions(selectedId = '') {
    return allCategories.map(cat =>
        `<option value="${cat.maDanhMuc}" ${cat.maDanhMuc == selectedId ? 'selected' : ''}>${cat.tenDanhMuc}</option>`
    ).join('');
}

// Tải danh sách sản phẩm
async function loadProducts(search = '') {
    productTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#A0AEC0;">Đang tải...</td></tr>`;
    try {
        const url = search ? `${API_URL}?search=${encodeURIComponent(search)}` : API_URL;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.success) {
            renderTable(json.data);
        } else {
            productTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;padding:40px;">Lỗi: ${json.message}</td></tr>`;
        }
    } catch (err) {
        console.error('loadProducts error:', err);
        productTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;padding:40px;">Không thể kết nối server. (${err.message})</td></tr>`;
    }
}

// Render bảng sản phẩm
function renderTable(data) {
    productTableBody.innerHTML = '';

    if (data.length === 0) {
        productTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#A0AEC0;">Không tìm thấy sản phẩm nào.</td></tr>`;
        return;
    }

    data.forEach(sp => {
        const giaFmt = Number(sp.gia).toLocaleString('vi-VN') + ' đ';
        const imgHtml = sp.hinhAnh
            ? `<img src="${sp.hinhAnh}" alt="${sp.tenSanPham}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;border:1px solid #E2E8F0;">`
            : `<div style="width:60px;height:60px;background:#EDF2F7;border-radius:8px;display:flex;align-items:center;justify-content:center;"><i class="ph ph-image" style="font-size:24px;color:#A0AEC0;"></i></div>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>#${sp.maSanPham}</strong></td>
            <td>${imgHtml}</td>
            <td>
                <div style="font-weight:600;color:#2D3748;">${sp.tenSanPham}</div>
                <div style="font-size:12px;color:#A0AEC0;margin-top:4px;">Tồn kho: ${sp.soLuongTon}</div>
            </td>
            <td><strong style="color:#2D6A4F;">${giaFmt}</strong></td>
            <td>
                <span style="background:#EDF2F7;color:#4A5568;padding:4px 10px;border-radius:20px;font-size:13px;">
                    ${sp.tenDanhMuc || '—'}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn-action btn-edit" onclick="editProduct(${sp.maSanPham})" title="Sửa sản phẩm">
                        <i class="ph ph-pencil-simple"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteProduct(${sp.maSanPham}, '${sp.tenSanPham.replace(/'/g, "\\'")}')" title="Xóa sản phẩm">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            </td>
        `;
        productTableBody.appendChild(tr);
    });
}

// Form HTML dùng chung cho thêm/sửa
function buildFormHtml(sp = {}) {
    return `
        <div style="text-align:left;display:flex;flex-direction:column;gap:14px;padding:4px 0;">
            <div>
                <label style="display:block;font-size:14px;font-weight:600;color:#2D3748;margin-bottom:6px;">
                    Tên sản phẩm <span style="color:#E53E3E">*</span>
                </label>
                <input id="sp-ten" class="swal2-input" style="width:100%;margin:0;box-sizing:border-box;border-radius:10px;"
                    placeholder="Nhập tên sản phẩm..." value="${sp.tenSanPham || ''}">
            </div>
            <div style="display:flex;gap:12px;">
                <div style="flex:1;">
                    <label style="display:block;font-size:14px;font-weight:600;color:#2D3748;margin-bottom:6px;">
                        Giá tiền (đ) <span style="color:#E53E3E">*</span>
                    </label>
                    <input id="sp-gia" class="swal2-input" type="number" min="0" style="width:100%;margin:0;box-sizing:border-box;border-radius:10px;"
                        placeholder="Ví dụ: 150000" value="${sp.gia || ''}">
                </div>
                <div style="flex:1;">
                    <label style="display:block;font-size:14px;font-weight:600;color:#2D3748;margin-bottom:6px;">
                        Tồn kho
                    </label>
                    <input id="sp-ton" class="swal2-input" type="number" min="0" style="width:100%;margin:0;box-sizing:border-box;border-radius:10px;"
                        placeholder="Ví dụ: 100" value="${sp.soLuongTon !== undefined ? sp.soLuongTon : ''}">
                </div>
            </div>
            <div>
                <label style="display:block;font-size:14px;font-weight:600;color:#2D3748;margin-bottom:6px;">
                    Danh mục <span style="color:#E53E3E">*</span>
                </label>
                <select id="sp-danhmuc" class="swal2-input" style="width:100%;margin:0;box-sizing:border-box;border-radius:10px;height:46px;">
                    <option value="">-- Chọn danh mục --</option>
                    ${renderCategoryOptions(sp.maDanhMuc)}
                </select>
            </div>
            <div>
                <label style="display:block;font-size:14px;font-weight:600;color:#2D3748;margin-bottom:6px;">
                    URL hình ảnh
                </label>
                <input id="sp-hinhanh" class="swal2-input" style="width:100%;margin:0;box-sizing:border-box;border-radius:10px;"
                    placeholder="https://..." value="${sp.hinhAnh || ''}">
            </div>
            <div>
                <label style="display:block;font-size:14px;font-weight:600;color:#2D3748;margin-bottom:6px;">
                    Mô tả
                </label>
                <textarea id="sp-mota" class="swal2-textarea" style="width:100%;margin:0;box-sizing:border-box;border-radius:10px;resize:vertical;min-height:80px;"
                    placeholder="Mô tả sản phẩm...">${sp.moTa || ''}</textarea>
            </div>
        </div>
    `;
}

// Validate và lấy dữ liệu form
function getFormData() {
    const tenSanPham = document.getElementById('sp-ten').value.trim();
    const gia = document.getElementById('sp-gia').value;
    const maDanhMuc = document.getElementById('sp-danhmuc').value;
    const hinhAnh = document.getElementById('sp-hinhanh').value.trim();
    const moTa = document.getElementById('sp-mota').value.trim();
    const soLuongTon = document.getElementById('sp-ton').value;

    if (!tenSanPham) { Swal.showValidationMessage('Vui lòng nhập tên sản phẩm!'); return false; }
    if (!gia || Number(gia) < 0) { Swal.showValidationMessage('Vui lòng nhập giá hợp lệ!'); return false; }
    if (!maDanhMuc) { Swal.showValidationMessage('Vui lòng chọn danh mục!'); return false; }

    return {
        tenSanPham,
        gia: Number(gia),
        maDanhMuc: Number(maDanhMuc),
        hinhAnh,
        moTa,
        soLuongTon: soLuongTon !== '' ? Number(soLuongTon) : 0
    };
}

// Thêm sản phẩm
async function addProduct() {
    const { value: formValues } = await Swal.fire({
        title: 'Thêm sản phẩm mới',
        html: buildFormHtml(),
        width: 600,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#5C4033',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Thêm mới',
        cancelButtonText: 'Hủy bỏ',
        preConfirm: getFormData
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
            Swal.fire({ title: 'Thành công!', text: `Đã thêm sản phẩm "${formValues.tenSanPham}"`, icon: 'success', timer: 1500, showConfirmButton: false });
            loadProducts(searchInput.value);
        } else {
            Swal.fire({ title: 'Lỗi!', text: json.message, icon: 'error' });
        }
    } catch {
        Swal.fire({ title: 'Lỗi!', text: 'Không thể kết nối server.', icon: 'error' });
    }
}

// Sửa sản phẩm
async function editProduct(id) {
    // Lấy thông tin hiện tại
    let sp = {};
    try {
        const res = await fetch(`${API_URL}/${id}`);
        const json = await res.json();
        if (json.success) sp = json.data;
    } catch {
        Swal.fire({ title: 'Lỗi!', text: 'Không thể tải thông tin sản phẩm.', icon: 'error' });
        return;
    }

    const { value: formValues } = await Swal.fire({
        title: 'Sửa sản phẩm',
        html: buildFormHtml(sp),
        width: 600,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#3182CE',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Cập nhật',
        cancelButtonText: 'Hủy bỏ',
        preConfirm: getFormData
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
            Swal.fire({ title: 'Đã cập nhật!', text: 'Thông tin sản phẩm đã được thay đổi.', icon: 'success', timer: 1500, showConfirmButton: false });
            loadProducts(searchInput.value);
        } else {
            Swal.fire({ title: 'Lỗi!', text: json.message, icon: 'error' });
        }
    } catch {
        Swal.fire({ title: 'Lỗi!', text: 'Không thể kết nối server.', icon: 'error' });
    }
}

// Xóa sản phẩm
function deleteProduct(id, name) {
    Swal.fire({
        title: 'Bạn có chắc chắn?',
        text: `Sản phẩm "${name}" sẽ bị xóa vĩnh viễn!`,
        icon: 'warning',
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
                Swal.fire({ title: 'Đã xóa!', text: 'Sản phẩm đã được xóa khỏi hệ thống.', icon: 'success', timer: 1500, showConfirmButton: false });
                loadProducts(searchInput.value);
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
    searchTimeout = setTimeout(() => loadProducts(this.value), 300);
});

document.addEventListener('DOMContentLoaded', async () => {
    await loadCategories();
    loadProducts();
});
