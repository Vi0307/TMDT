// Dữ liệu mẫu nhà cung cấp
let suppliers = [
    { id: "NCC001", name: "Làng gốm Thanh Hà", phone: "0901234567", address: "Khối Bàu Súng, phường Thanh Hà, Hội An" },
    { id: "NCC002", name: "Mộc Kim Bồng", phone: "0912345678", address: "Xã Cẩm Kim, thành phố Hội An" },
    { id: "NCC003", name: "Lụa tơ tằm Mã Châu", phone: "0923456789", address: "Thị trấn Nam Phước, Duy Xuyên, Quảng Nam" },
    { id: "NCC004", name: "Cơ sở đèn lồng Huỳnh Phát", phone: "0934567890", address: "Phố cổ Hội An" }
];

const supplierTableBody = document.getElementById('supplierTableBody');
const searchInput = document.getElementById('searchInput');

// Hàm render bảng dữ liệu
function renderTable(data) {
    supplierTableBody.innerHTML = '';
    
    if (data.length === 0) {
        supplierTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 40px; color:#A0AEC0; font-size: 15px;">Không tìm thấy nhà cung cấp nào.</td></tr>`;
        return;
    }

    data.forEach(supplier => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td><strong>${supplier.id}</strong></td>
            <td>${supplier.name}</td>
            <td>
                <div class="contact-info">
                    <div class="contact-info-item"><i class="ph ph-phone"></i> ${supplier.phone}</div>
                    <div class="contact-info-item"><i class="ph ph-map-pin"></i> ${supplier.address}</div>
                </div>
            </td>
            <td class="actions">
                <button class="btn-action btn-edit" onclick="editSupplier('${supplier.id}')" title="Sửa thông tin">
                    <i class="ph ph-pencil-simple"></i>
                </button>
                <button class="btn-action btn-delete" onclick="deleteSupplier('${supplier.id}')" title="Xóa nhà cung cấp">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        
        supplierTableBody.appendChild(tr);
    });
}

// Popup Form Layout dùng chung cho Add & Edit
function getSupplierFormHtml(name = '', phone = '', address = '') {
    return `
        <div style="text-align: left; padding: 10px 0;">
            <div style="margin-bottom: 20px;">
                <label for="swal-input-name" style="display: block; font-size: 15px; font-weight: 600; color: #2D3748; margin-bottom: 8px;">Tên nhà cung cấp <span style="color:#E53E3E">*</span></label>
                <input id="swal-input-name" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; font-size: 15px; border-radius: 10px;" placeholder="Tên cơ sở, công ty..." value="${name}">
            </div>
            <div style="margin-bottom: 20px;">
                <label for="swal-input-phone" style="display: block; font-size: 15px; font-weight: 600; color: #2D3748; margin-bottom: 8px;">Số điện thoại <span style="color:#E53E3E">*</span></label>
                <input id="swal-input-phone" type="text" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; font-size: 15px; border-radius: 10px;" placeholder="Nhập số điện thoại liên hệ" value="${phone}">
            </div>
            <div style="margin-bottom: 8px;">
                <label for="swal-input-address" style="display: block; font-size: 15px; font-weight: 600; color: #2D3748; margin-bottom: 8px;">Địa chỉ <span style="color:#E53E3E">*</span></label>
                <input id="swal-input-address" type="text" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; font-size: 15px; border-radius: 10px;" placeholder="Nhập địa chỉ nhà cung cấp" value="${address}">
            </div>
        </div>
    `;
}

// Validator cho form
function validateSupplierForm() {
    const name = document.getElementById('swal-input-name').value.trim();
    const phone = document.getElementById('swal-input-phone').value.trim();
    const address = document.getElementById('swal-input-address').value.trim();
    
    if (!name) return Swal.showValidationMessage('Bạn cần nhập tên nhà cung cấp!');
    if (!phone) return Swal.showValidationMessage('Bạn cần nhập số điện thoại!');
    if (!address) return Swal.showValidationMessage('Bạn cần nhập địa chỉ!');
    
    return { name, phone, address };
}

// Hàm thêm nhà cung cấp mới
async function addSupplier() {
    const { value: formValues } = await Swal.fire({
        title: 'Thêm nhà cung cấp mới',
        html: getSupplierFormHtml(),
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#5C4033',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Thêm mới',
        cancelButtonText: 'Hủy bỏ',
        preConfirm: validateSupplierForm
    });

    if (formValues) {
        // Sinh ID tự động
        const newId = 'NCC' + String(suppliers.length + 1).padStart(3, '0');
        suppliers.push({
            id: newId,
            name: formValues.name,
            phone: formValues.phone,
            address: formValues.address
        });
        
        renderTable(suppliers);
        
        Swal.fire({
            title: 'Thành công!',
            text: `Đã thêm nhà cung cấp "${formValues.name}"`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });
    }
}

// Hàm sửa thông tin nhà cung cấp
async function editSupplier(supplierId) {
    const index = suppliers.findIndex(s => s.id === supplierId);
    if (index !== -1) {
        const supplier = suppliers[index];
        
        const { value: formValues } = await Swal.fire({
            title: 'Sửa thông tin',
            html: getSupplierFormHtml(supplier.name, supplier.phone, supplier.address),
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#3182CE',
            cancelButtonColor: '#A0AEC0',
            confirmButtonText: 'Cập nhật',
            cancelButtonText: 'Hủy bỏ',
            preConfirm: validateSupplierForm
        });

        if (formValues) {
            suppliers[index].name = formValues.name;
            suppliers[index].phone = formValues.phone;
            suppliers[index].address = formValues.address;
            renderTable(suppliers);
            
            Swal.fire({
                title: 'Đã cập nhật!',
                text: 'Thông tin liên hệ đã được lưu lại.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        }
    }
}

// Hàm xóa nhà cung cấp
function deleteSupplier(supplierId) {
    const supplier = suppliers.find(s => s.id === supplierId);
    
    Swal.fire({
        title: 'Xóa nhà cung cấp?',
        text: `Bạn có chắc muốn xóa "${supplier.name}"? Dữ liệu này không thể khôi phục!`,
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#E53E3E',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Hủy bỏ'
    }).then((result) => {
        if (result.isConfirmed) {
            suppliers = suppliers.filter(s => s.id !== supplierId);
            renderTable(suppliers);
            
            Swal.fire({
                title: 'Đã xóa!',
                text: 'Nhà cung cấp đã bị xóa khỏi hệ thống.',
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
    const filteredSuppliers = suppliers.filter(s => 
        s.name.toLowerCase().includes(keyword) || 
        s.id.toLowerCase().includes(keyword) ||
        s.phone.includes(keyword) ||
        s.address.toLowerCase().includes(keyword)
    );
    renderTable(filteredSuppliers);
});

// Render dữ liệu ban đầu
document.addEventListener('DOMContentLoaded', () => {
    renderTable(suppliers);
});
