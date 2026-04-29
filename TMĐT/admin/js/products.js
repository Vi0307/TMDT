// Dữ liệu mẫu (Mock data)
let products = [
    { 
        id: "LUM92841", 
        name: "Strawberry Shortcake", 
        image: "https://placehold.co/60x60/F8F4ED/5C4033?text=SP", 
        price: "850.000đ", 
        category: "Nến thơm", 
        brand: "Scandleted", 
        weight: "200g" 
    },
    { 
        id: "LUM85501", 
        name: "Black Cedarwood", 
        image: "https://placehold.co/60x60/F8F4ED/5C4033?text=SP", 
        price: "540.000đ", 
        category: "Nến thơm", 
        brand: "Scandleted", 
        weight: "150g" 
    },
    { 
        id: "LUM81722", 
        name: "Jo Malone Peony", 
        image: "https://placehold.co/60x60/F8F4ED/5C4033?text=SP", 
        price: "1.250.000đ", 
        category: "Nến cao cấp", 
        brand: "Jo Malone", 
        weight: "300g" 
    }
];

const productTableBody = document.getElementById('productTableBody');
const searchInput = document.getElementById('searchInput');

// Hàm render bảng dữ liệu
function renderTable(data) {
    productTableBody.innerHTML = '';
    
    if (data.length === 0) {
        productTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 40px; color:#A0AEC0; font-size: 14px;">Không tìm thấy sản phẩm nào.</td></tr>`;
        return;
    }

    data.forEach(product => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid #EAE3D9";
        
        tr.innerHTML = `
            <td style="padding: 16px; font-size: 13px; color: #555;">${product.id}</td>
            <td style="padding: 16px; font-size: 13px; color: #555;">${product.name}</td>
            <td style="padding: 16px;"><img src="${product.image}" class="product-img" alt="Ảnh SP"></td>
            <td style="padding: 16px; font-size: 13px; color: #555;">${product.price}</td>
            <td style="padding: 16px; font-size: 13px; color: #555;">${product.category}</td>
            <td style="padding: 16px; font-size: 13px; color: #555;">${product.brand}</td>
            <td style="padding: 16px; font-size: 13px; color: #555;">${product.weight}</td>
            <td style="padding: 16px;">
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
                <label style="display: block; font-size: 14px; font-weight: 600; color: #2D3748; margin-bottom: 8px;">Tên sản phẩm <span style="color:#E53E3E">*</span></label>
                <input id="swal-prod-name" class="swal2-input" style="width: 100%; margin: 0; font-size: 14px; border-radius: 8px;" placeholder="Ví dụ: Nến thơm Jo Malone" value="${product.name || ''}">
            </div>
            <div style="display: flex; gap: 16px; margin-bottom: 16px;">
                <div style="flex: 1;">
                    <label style="display: block; font-size: 14px; font-weight: 600; color: #2D3748; margin-bottom: 8px;">Giá tiền <span style="color:#E53E3E">*</span></label>
                    <input id="swal-prod-price" type="text" class="swal2-input" style="width: 100%; margin: 0; font-size: 14px; border-radius: 8px;" placeholder="Vd: 850.000đ" value="${product.price || ''}">
                </div>
                <div style="flex: 1;">
                    <label style="display: block; font-size: 14px; font-weight: 600; color: #2D3748; margin-bottom: 8px;">Danh mục</label>
                    <input id="swal-prod-category" type="text" class="swal2-input" style="width: 100%; margin: 0; font-size: 14px; border-radius: 8px;" placeholder="Vd: Nến thơm" value="${product.category || ''}">
                </div>
            </div>
            <div style="display: flex; gap: 16px; margin-bottom: 16px;">
                <div style="flex: 1;">
                    <label style="display: block; font-size: 14px; font-weight: 600; color: #2D3748; margin-bottom: 8px;">Hãng</label>
                    <input id="swal-prod-brand" type="text" class="swal2-input" style="width: 100%; margin: 0; font-size: 14px; border-radius: 8px;" placeholder="Vd: Jo Malone" value="${product.brand || ''}">
                </div>
                <div style="flex: 1;">
                    <label style="display: block; font-size: 14px; font-weight: 600; color: #2D3748; margin-bottom: 8px;">Khối lượng</label>
                    <input id="swal-prod-weight" type="text" class="swal2-input" style="width: 100%; margin: 0; font-size: 14px; border-radius: 8px;" placeholder="Vd: 200g" value="${product.weight || ''}">
                </div>
            </div>
        </div>
    `;
}

// Validator cho form sản phẩm
function validateProductForm() {
    const name = document.getElementById('swal-prod-name').value.trim();
    const price = document.getElementById('swal-prod-price').value.trim();
    const category = document.getElementById('swal-prod-category').value.trim();
    const brand = document.getElementById('swal-prod-brand').value.trim();
    const weight = document.getElementById('swal-prod-weight').value.trim();
    
    if (!name) return Swal.showValidationMessage('Vui lòng nhập tên sản phẩm!');
    if (!price) return Swal.showValidationMessage('Vui lòng nhập giá tiền!');
    
    return { name, price, category, brand, weight };
}

// Hàm thêm sản phẩm mới
async function addProduct() {
    const { value: formValues } = await Swal.fire({
        title: 'Thêm sản phẩm',
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
        const newId = 'LUM' + Math.floor(Math.random() * 90000 + 10000);
        products.unshift({
            id: newId,
            name: formValues.name,
            image: "https://placehold.co/60x60/F8F4ED/5C4033?text=Mới", // Ảnh mặc định
            price: formValues.price,
            category: formValues.category,
            brand: formValues.brand,
            weight: formValues.weight
        });
        
        renderTable(products);
        
        Swal.fire({
            title: 'Thành công!',
            text: `Đã thêm sản phẩm "${formValues.name}"`,
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
            products[index].brand = formValues.brand;
            products[index].weight = formValues.weight;
            
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
        text: `Bạn có chắc muốn xóa "${product.name}"? Dữ liệu này không thể khôi phục!`,
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
        p.brand.toLowerCase().includes(keyword) ||
        p.category.toLowerCase().includes(keyword)
    );
    renderTable(filteredProducts);
});

// Render dữ liệu ban đầu
document.addEventListener('DOMContentLoaded', () => {
    renderTable(products);
});
