// Dữ liệu mẫu phiếu nhập
let receipts = [
    { id: "PN001", nccId: "NCC001", date: "2024-05-01" },
    { id: "PN002", nccId: "NCC002", date: "2024-05-02" },
    { id: "PN003", nccId: "NCC003", date: "2024-05-03" },
    { id: "PN004", nccId: "NCC004", date: "2024-05-05" }
];

const receiptTableBody = document.getElementById('receiptTableBody');
const searchInput = document.getElementById('searchInput');

// Hàm render bảng dữ liệu
function renderTable(data) {
    receiptTableBody.innerHTML = '';
    
    if (data.length === 0) {
        receiptTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 40px; color:#A0AEC0; font-size: 15px;">Không tìm thấy phiếu nhập nào.</td></tr>`;
        return;
    }

    data.forEach(receipt => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td><strong>${receipt.id}</strong></td>
            <td>${receipt.nccId}</td>
            <td>
                <div class="contact-info">
                    <div class="contact-info-item"><i class="ph ph-calendar-blank"></i> ${receipt.date}</div>
                </div>
            </td>
            <td class="actions">
                <button class="btn-action btn-edit" onclick="editReceipt('${receipt.id}')" title="Sửa thông tin">
                    <i class="ph ph-pencil-simple"></i>
                </button>
                <button class="btn-action btn-delete" onclick="deleteReceipt('${receipt.id}')" title="Xóa phiếu nhập">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        
        receiptTableBody.appendChild(tr);
    });
}

// Popup Form Layout dùng chung cho Add & Edit
function getReceiptFormHtml(nccId = '', date = '') {
    return `
        <div style="text-align: left; padding: 10px 0;">
            <div style="margin-bottom: 20px;">
                <label for="swal-input-ncc" style="display: block; font-size: 15px; font-weight: 600; color: #2D3748; margin-bottom: 8px;">Mã nhà cung cấp <span style="color:#E53E3E">*</span></label>
                <input id="swal-input-ncc" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; font-size: 15px; border-radius: 10px;" placeholder="Ví dụ: NCC001" value="${nccId}">
            </div>
            <div style="margin-bottom: 20px;">
                <label for="swal-input-date" style="display: block; font-size: 15px; font-weight: 600; color: #2D3748; margin-bottom: 8px;">Ngày nhập <span style="color:#E53E3E">*</span></label>
                <input id="swal-input-date" type="date" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; font-size: 15px; border-radius: 10px;" value="${date}">
            </div>
        </div>
    `;
}

// Validator cho form
function validateReceiptForm() {
    const nccId = document.getElementById('swal-input-ncc').value.trim();
    const date = document.getElementById('swal-input-date').value.trim();
    
    if (!nccId) return Swal.showValidationMessage('Bạn cần nhập mã nhà cung cấp!');
    if (!date) return Swal.showValidationMessage('Bạn cần chọn ngày nhập!');
    
    return { nccId, date };
}

// Hàm thêm phiếu nhập mới
async function addReceipt() {
    const { value: formValues } = await Swal.fire({
        title: 'Thêm phiếu nhập mới',
        html: getReceiptFormHtml(),
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#5C4033',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Thêm mới',
        cancelButtonText: 'Hủy bỏ',
        preConfirm: validateReceiptForm
    });

    if (formValues) {
        // Sinh ID tự động
        const newId = 'PN' + String(receipts.length + 1).padStart(3, '0');
        receipts.push({
            id: newId,
            nccId: formValues.nccId,
            date: formValues.date
        });
        
        renderTable(receipts);
        
        Swal.fire({
            title: 'Thành công!',
            text: `Đã thêm phiếu nhập "${newId}"`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });
    }
}

// Hàm sửa thông tin phiếu nhập
async function editReceipt(receiptId) {
    const index = receipts.findIndex(r => r.id === receiptId);
    if (index !== -1) {
        const receipt = receipts[index];
        
        const { value: formValues } = await Swal.fire({
            title: 'Sửa thông tin',
            html: getReceiptFormHtml(receipt.nccId, receipt.date),
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#3182CE',
            cancelButtonColor: '#A0AEC0',
            confirmButtonText: 'Cập nhật',
            cancelButtonText: 'Hủy bỏ',
            preConfirm: validateReceiptForm
        });

        if (formValues) {
            receipts[index].nccId = formValues.nccId;
            receipts[index].date = formValues.date;
            renderTable(receipts);
            
            Swal.fire({
                title: 'Đã cập nhật!',
                text: 'Thông tin phiếu nhập đã được lưu lại.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        }
    }
}

// Hàm xóa phiếu nhập
function deleteReceipt(receiptId) {
    Swal.fire({
        title: 'Xóa phiếu nhập?',
        text: `Bạn có chắc muốn xóa phiếu nhập "${receiptId}"? Dữ liệu này không thể khôi phục!`,
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#E53E3E',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Hủy bỏ'
    }).then((result) => {
        if (result.isConfirmed) {
            receipts = receipts.filter(r => r.id !== receiptId);
            renderTable(receipts);
            
            Swal.fire({
                title: 'Đã xóa!',
                text: 'Phiếu nhập đã bị xóa khỏi hệ thống.',
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
    const filteredReceipts = receipts.filter(r => 
        r.nccId.toLowerCase().includes(keyword) || 
        r.id.toLowerCase().includes(keyword) ||
        r.date.includes(keyword)
    );
    renderTable(filteredReceipts);
});

// Render dữ liệu ban đầu
document.addEventListener('DOMContentLoaded', () => {
    renderTable(receipts);
});
