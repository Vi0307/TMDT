// Dữ liệu mẫu (Mock data) dựa trên CSDL sqlHoiAn
let categories = [
    { id: "DM001", name: "Thủ công mỹ nghệ", productCount: 12 },
    { id: "DM002", name: "Đặc sản địa phương", productCount: 8 },
    { id: "DM003", name: "Quà lưu niệm", productCount: 25 },
    { id: "DM004", name: "Trang phục", productCount: 15 },
    { id: "DM005", name: "Chăm sóc sức khỏe & thư giãn", productCount: 10 }
];

const categoryTableBody = document.getElementById('categoryTableBody');
const searchInput = document.getElementById('searchInput');

// Hàm render bảng dữ liệu
function renderTable(data) {
    categoryTableBody.innerHTML = '';
    
    if (data.length === 0) {
        categoryTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 40px; color:#A0AEC0; font-size: 15px;">Không tìm thấy danh mục nào.</td></tr>`;
        return;
    }

    data.forEach(category => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td><strong>${category.id}</strong></td>
            <td>${category.name}</td>
            <td>
                <span class="status-badge" style="background-color: #EDF2F7; color: #4A5568; border: none;">
                    ${category.productCount} sản phẩm
                </span>
            </td>
            <td class="actions">
                <button class="btn-action btn-edit" onclick="editCategory('${category.id}')" title="Sửa danh mục">
                    <i class="ph ph-pencil-simple"></i>
                </button>
                <button class="btn-action btn-delete" onclick="deleteCategory('${category.id}')" title="Xóa danh mục">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        
        categoryTableBody.appendChild(tr);
    });
}

// Hàm thêm danh mục mới với SweetAlert2
async function addCategory() {
    const { value: formValues } = await Swal.fire({
        title: 'Thêm danh mục mới',
        html: `
            <div style="text-align: left; padding: 10px 0;">
                <div style="margin-bottom: 24px;">
                    <label for="swal-input1" style="display: block; font-size: 15px; font-weight: 600; color: #2D3748; margin-bottom: 8px;">Tên danh mục <span style="color:#E53E3E">*</span></label>
                    <input id="swal-input1" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; font-size: 15px; border-radius: 10px;" placeholder="Ví dụ: Đồ thủ công mỹ nghệ...">
                </div>
                <div style="margin-bottom: 8px;">
                    <label for="swal-input2" style="display: block; font-size: 15px; font-weight: 600; color: #2D3748; margin-bottom: 8px;">Số lượng sản phẩm <span style="color:#E53E3E">*</span></label>
                    <input id="swal-input2" type="number" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; font-size: 15px; border-radius: 10px;" placeholder="Nhập số lượng" min="0" value="0">
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
            const name = document.getElementById('swal-input1').value;
            const count = document.getElementById('swal-input2').value;
            if (!name) {
                Swal.showValidationMessage('Bạn cần nhập tên danh mục!');
                return false;
            }
            if (!count || count < 0) {
                Swal.showValidationMessage('Bạn cần nhập số lượng hợp lệ!');
                return false;
            }
            return { name: name, count: parseInt(count) };
        }
    });

    if (formValues) {
        // Sinh ID tự động (chỉ dùng cho demo)
        const newId = 'DM' + String(categories.length + 1).padStart(3, '0');
        categories.push({
            id: newId,
            name: formValues.name,
            productCount: formValues.count
        });
        
        renderTable(categories);
        
        Swal.fire({
            title: 'Thành công!',
            text: `Đã thêm danh mục "${formValues.name}"`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });
    }
}

// Hàm sửa danh mục với SweetAlert2
async function editCategory(categoryId) {
    const categoryIndex = categories.findIndex(c => c.id === categoryId);
    if (categoryIndex !== -1) {
        const category = categories[categoryIndex];
        
        const { value: formValues } = await Swal.fire({
            title: 'Sửa danh mục',
            html: `
                <div style="text-align: left; padding: 10px 0;">
                    <div style="margin-bottom: 24px;">
                        <label for="swal-input1" style="display: block; font-size: 15px; font-weight: 600; color: #2D3748; margin-bottom: 8px;">Tên danh mục <span style="color:#E53E3E">*</span></label>
                        <input id="swal-input1" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; font-size: 15px; border-radius: 10px;" placeholder="Nhập tên danh mục" value="${category.name}">
                    </div>
                    <div style="margin-bottom: 8px;">
                        <label for="swal-input2" style="display: block; font-size: 15px; font-weight: 600; color: #2D3748; margin-bottom: 8px;">Số lượng sản phẩm <span style="color:#E53E3E">*</span></label>
                        <input id="swal-input2" type="number" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; font-size: 15px; border-radius: 10px;" placeholder="Nhập số lượng" min="0" value="${category.productCount}">
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
                const name = document.getElementById('swal-input1').value;
                const count = document.getElementById('swal-input2').value;
                if (!name) {
                    Swal.showValidationMessage('Tên danh mục không được để trống!');
                    return false;
                }
                if (!count || count < 0) {
                    Swal.showValidationMessage('Số lượng không được để trống hoặc nhỏ hơn 0!');
                    return false;
                }
                return { name: name, count: parseInt(count) };
            }
        });

        if (formValues) {
            categories[categoryIndex].name = formValues.name;
            categories[categoryIndex].productCount = formValues.count;
            renderTable(categories);
            
            Swal.fire({
                title: 'Đã cập nhật!',
                text: 'Thông tin danh mục đã được thay đổi.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        }
    }
}

// Hàm xóa danh mục
function deleteCategory(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    
    // Kiểm tra xem danh mục có sản phẩm không
    if (category.productCount > 0) {
        Swal.fire({
            title: 'Không thể xóa!',
            text: `Danh mục này đang có ${category.productCount} sản phẩm. Vui lòng chuyển hoặc xóa các sản phẩm trước.`,
            icon: 'warning',
            confirmButtonColor: '#5C4033'
        });
        return;
    }

    Swal.fire({
        title: 'Bạn có chắc chắn?',
        text: `Danh mục ${category.name} sẽ bị xóa vĩnh viễn!`,
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#E53E3E',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Hủy bỏ'
    }).then((result) => {
        if (result.isConfirmed) {
            categories = categories.filter(c => c.id !== categoryId);
            renderTable(categories);
            
            Swal.fire({
                title: 'Đã xóa!',
                text: 'Danh mục đã được xóa khỏi hệ thống.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        }
    });
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

// Hàm tìm kiếm
searchInput.addEventListener('input', function() {
    const keyword = this.value.toLowerCase();
    const filteredCategories = categories.filter(category => 
        category.name.toLowerCase().includes(keyword) || 
        category.id.toLowerCase().includes(keyword)
    );
    renderTable(filteredCategories);
});

// Render dữ liệu ban đầu
document.addEventListener('DOMContentLoaded', () => {
    renderTable(categories);
});
