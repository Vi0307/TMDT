// Dữ liệu mẫu (Mock data)
let products = [
    { 
        id: "SP001", 
        name: "Đèn lồng Hội An", 
        image: "https://placehold.co/60x60/F8F4ED/5C4033?text=SP", 
        price: "120.000đ", 
        category: "Thủ công mỹ nghệ", 
        desc: "Làm thủ công truyền thống" 
    },
    { 
        id: "SP002", 
        name: "Tượng gỗ Kim Bồng", 
        image: "https://placehold.co/60x60/F8F4ED/5C4033?text=SP", 
        price: "350.000đ", 
        category: "Thủ công mỹ nghệ", 
        desc: "Chạm khắc tinh xảo" 
    },
    { 
        id: "SP003", 
        name: "Cao lầu Hội An", 
        image: "https://placehold.co/60x60/F8F4ED/5C4033?text=SP", 
        price: "50.000đ", 
        category: "Đặc sản địa phương", 
        desc: "Đặc sản nổi tiếng" 
    }
];

const productTableBody = document.getElementById('productTableBody');
const searchInput = document.getElementById('searchInput');

// Hàm render bảng dữ liệu
function renderTable(data) {
    productTableBody.innerHTML = '';
    
    if (data.length === 0) {
        productTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 40px; color:#A0AEC0; font-size: 15px;">Không tìm thấy sản phẩm nào.</td></tr>`;
        return;
    }

    data.forEach(product => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td><strong>${product.id}</strong></td>
            <td><img src="${product.image}" class="product-img" alt="Ảnh SP"></td>
            <td>
                <div class="product-info">
                    <strong>${product.name}</strong>
                    <span class="product-desc" title="${product.desc}">${product.desc}</span>
                </div>
            </td>
            <td>${product.price}</td>
            <td>${product.category}</td>
            <td class="actions">
                <button class="btn-action btn-edit" onclick="editProduct('${product.id}')" title="Sửa sản phẩm">
                    <i class="ph ph-pencil-simple"></i>
                </button>
                <button class="btn-action btn-delete" onclick="deleteProduct('${product.id}')" title="Xóa sản phẩm">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        
        productTableBody.appendChild(tr);
    });
}

// Hàm lấy Form HTML dùng chung cho Thêm / Sửa
function getProductFormHtml(product = {}) {
    return `
        <div style="text-align: left; padding: 10px 0;">
            <div style="margin-bottom: 16px;">
                <label style="display: block; font-size: 15px; font-weight: 600; color: #2D3748; margin-bottom: 8px;">Tên sản phẩm <span style="color:#E53E3E">*</span></label>
                <input id="swal-prod-name" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; font-size: 15px; border-radius: 10px;" placeholder="Ví dụ: Đèn lồng Hội An" value="${product.name || ''}">
            </div>
            <div style="display: flex; gap: 16px; margin-bottom: 16px;">
                <div style="flex: 1;">
                    <label style="display: block; font-size: 15px; font-weight: 600; color: #2D3748; margin-bottom: 8px;">Giá tiền <span style="color:#E53E3E">*</span></label>
                    <input id="swal-prod-price" type="text" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; font-size: 15px; border-radius: 10px;" placeholder="Vd: 120.000đ" value="${product.price || ''}">
                </div>
                <div style="flex: 1;">
                    <label style="display: block; font-size: 15px; font-weight: 600; color: #2D3748; margin-bottom: 8px;">Danh mục <span style="color:#E53E3E">*</span></label>
                    <input id="swal-prod-category" type="text" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; font-size: 15px; border-radius: 10px;" placeholder="Vd: Thủ công mỹ nghệ" value="${product.category || ''}">
                </div>
            </div>
            <div style="margin-bottom: 16px;">
                <label style="display: block; font-size: 15px; font-weight: 600; color: #2D3748; margin-bottom: 8px;">Mô tả sản phẩm</label>
                <input id="swal-prod-desc" type="text" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; font-size: 15px; border-radius: 10px;" placeholder="Vd: Làm thủ công truyền thống" value="${product.desc || ''}">
            </div>
            <div style="margin-bottom: 8px;">
                <label style="display: block; font-size: 15px; font-weight: 600; color: #2D3748; margin-bottom: 8px;">Link hình ảnh</label>
                <input id="swal-prod-image" type="text" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; font-size: 15px; border-radius: 10px;" placeholder="URL hình ảnh" value="${product.image || 'https://placehold.co/60x60/F8F4ED/5C4033?text=SP'}">
            </div>
        </div>
    `;
}

// Validator cho form sản phẩm
function validateProductForm() {
    const name = document.getElementById('swal-prod-name').value.trim();
    const price = document.getElementById('swal-prod-price').value.trim();
    const category = document.getElementById('swal-prod-category').value.trim();
    const desc = document.getElementById('swal-prod-desc').value.trim();
    const image = document.getElementById('swal-prod-image').value.trim();
    
    if (!name) return Swal.showValidationMessage('Vui lòng nhập tên sản phẩm!');
    if (!price) return Swal.showValidationMessage('Vui lòng nhập giá tiền!');
    if (!category) return Swal.showValidationMessage('Vui lòng nhập danh mục!');
    
    return { name, price, category, desc, image };
}

// Hàm thêm sản phẩm mới
async function addProduct() {
    const { value: formValues } = await Swal.fire({
        title: 'Thêm sản phẩm mới',
        width: 600,
        html: getProductFormHtml(),
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#5C4033',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Lưu sản phẩm',
        cancelButtonText: 'Hủy',
        preConfirm: validateProductForm
    });

    if (formValues) {
        const newId = 'SP' + String(products.length + 1).padStart(3, '0');
        products.unshift({
            id: newId,
            name: formValues.name,
            image: formValues.image || "https://placehold.co/60x60/F8F4ED/5C4033?text=Mới",
            price: formValues.price,
            category: formValues.category,
            desc: formValues.desc
        });
        
        renderTable(products);
        
        Swal.fire({
            title: 'Thành công!',
            text: `Đã thêm sản phẩm mới thành công.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });
    }
}

// Hàm sửa thông tin sản phẩm
async function editProduct(productId) {
    const index = products.findIndex(p => p.id === productId);
    if (index !== -1) {
        const product = products[index];
        
        const { value: formValues } = await Swal.fire({
            title: 'Chỉnh sửa sản phẩm',
            width: 600,
            html: getProductFormHtml(product),
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#3182CE',
            cancelButtonColor: '#A0AEC0',
            confirmButtonText: 'Cập nhật',
            cancelButtonText: 'Hủy',
            preConfirm: validateProductForm
        });

        if (formValues) {
            products[index].name = formValues.name;
            products[index].price = formValues.price;
            products[index].category = formValues.category;
            products[index].desc = formValues.desc;
            products[index].image = formValues.image;
            
            renderTable(products);
            
            Swal.fire({
                title: 'Đã cập nhật!',
                text: 'Thông tin sản phẩm đã được lưu lại.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        }
    }
}

// Hàm xóa sản phẩm
function deleteProduct(productId) {
    const product = products.find(p => p.id === productId);
    
    Swal.fire({
        title: 'Xóa sản phẩm?',
        text: `Bạn có chắc muốn xóa sản phẩm này? Dữ liệu này không thể khôi phục!`,
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#E53E3E',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Hủy bỏ'
    }).then((result) => {
        if (result.isConfirmed) {
            products = products.filter(p => p.id !== productId);
            renderTable(products);
            
            Swal.fire({
                title: 'Đã xóa!',
                text: 'Sản phẩm đã bị xóa khỏi hệ thống.',
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
    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(keyword) || 
        p.id.toLowerCase().includes(keyword) ||
        p.category.toLowerCase().includes(keyword) ||
        p.desc.toLowerCase().includes(keyword)
    );
    renderTable(filteredProducts);
});

// Render dữ liệu ban đầu
document.addEventListener('DOMContentLoaded', () => {
    renderTable(products);
});
