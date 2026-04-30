// Dữ liệu mẫu yêu cầu hoàn hàng
let returns = [
    {
        id: "HA-99281",
        user: "Nguyen Van A",
        reason: "Sản phẩm lỗi",
        detail: "Khăn lụa bị rách một đường nhỏ ở viền.",
        proof: "https://lh3.googleusercontent.com/aida-public/AB6AXuDKmPkgmYaFcXiNaTOVEYNu2htHqdGa7rY-tYXiwUsbhUqEYwvXf0NJWDs93fIIwfYMTmr-CS8zHakCTvxhiKfRg4I0edvEniSvoOcQHqRCcRgi68_DsZnB5hjY9gvdZAf7Q7AIkefKGmiqU6SwkwrGIOoOBjrjcMNFLgiikYHSzHB9h0LZsfeTLhSZwJgx4SNSiZS8gg1Icsuvsou8PAA7g6rMeXZsKaWmYUSc91N80NZbwMAq_vyhdrQ3g6XmsF5FCmDE19p7XoMs",
        status: "Chờ xác nhận"
    },
    {
        id: "HA-99282",
        user: "Tran Thi B",
        reason: "Thay đổi ý định",
        detail: "Mình không thích màu này nữa, muốn đổi trả.",
        proof: "",
        status: "Đã hoàn"
    },
    {
        id: "HA-99283",
        user: "Le Van C",
        reason: "Khác",
        detail: "Giao sai mẫu, tôi đặt đèn lồng đỏ mà giao màu vàng.",
        proof: "",
        status: "Từ chối"
    }
];

const returnTableBody = document.getElementById('returnTableBody');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');

// Hàm render bảng dữ liệu
function renderTable(data) {
    returnTableBody.innerHTML = '';
    
    if (data.length === 0) {
        returnTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 40px; color:#A0AEC0; font-size: 15px;">Không tìm thấy yêu cầu hoàn hàng nào.</td></tr>`;
        return;
    }

    data.forEach(req => {
        let statusClass = '';
        if (req.status === 'Chờ xác nhận') statusClass = 'status-locked'; // using locked style (redish) or we can create a warning style. We'll use locked for pending.
        else if (req.status === 'Đã hoàn') statusClass = 'status-active'; // green
        else statusClass = 'status-locked'; // red

        // Determine actions based on status
        let actionsHtml = `
            <button class="btn-action btn-view" onclick="viewReturn('${req.id}')" title="Xem chi tiết">
                <i class="ph ph-eye"></i>
            </button>
        `;
        
        if (req.status === 'Chờ xác nhận') {
            actionsHtml += `
                <button class="btn-action btn-approve" onclick="approveReturn('${req.id}')" title="Xác nhận hoàn">
                    <i class="ph ph-check-circle"></i>
                </button>
                <button class="btn-action btn-reject" onclick="rejectReturn('${req.id}')" title="Từ chối">
                    <i class="ph ph-x-circle"></i>
                </button>
            `;
        }

        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td><strong>${req.id}</strong></td>
            <td>${req.user}</td>
            <td>${req.reason}</td>
            <td><span class="status-badge ${statusClass}">${req.status}</span></td>
            <td class="actions">
                ${actionsHtml}
            </td>
        `;
        
        returnTableBody.appendChild(tr);
    });
}

// Popup Xem chi tiết
function viewReturn(reqId) {
    const req = returns.find(r => r.id === reqId);
    if (!req) return;

    let proofHtml = '';
    if (req.proof) {
        proofHtml = `<p><strong>Bằng chứng:</strong><br><img src="${req.proof}" class="proof-image" alt="Bằng chứng hoàn hàng" /></p>`;
    } else {
        proofHtml = `<p><strong>Bằng chứng:</strong> Không có hình ảnh đính kèm.</p>`;
    }

    let statusHtml = `<p><strong>Trạng thái:</strong> ${req.status}</p>`;

    Swal.fire({
        title: 'Chi tiết yêu cầu hoàn hàng',
        html: `
            <div class="return-detail-box">
                <p><strong>Mã Đơn:</strong> ${req.id}</p>
                <p><strong>Khách hàng:</strong> ${req.user}</p>
                <p><strong>Lý do:</strong> ${req.reason}</p>
                <p><strong>Chi tiết:</strong> ${req.detail}</p>
                ${proofHtml}
                ${statusHtml}
            </div>
        `,
        confirmButtonColor: '#5C4033',
        confirmButtonText: 'Đóng',
        width: 600
    });
}

// Xác nhận hoàn hàng
function approveReturn(reqId) {
    Swal.fire({
        title: 'Xác nhận hoàn hàng?',
        text: `Bạn có chắc chắn muốn XÁC NHẬN yêu cầu hoàn hàng cho đơn "${reqId}"?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#38A169',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Xác nhận',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            const index = returns.findIndex(r => r.id === reqId);
            if (index !== -1) {
                returns[index].status = 'Đã hoàn';
                filterAndRender();
                Swal.fire({
                    title: 'Thành công!',
                    text: 'Đã xác nhận hoàn hàng thành công.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        }
    });
}

// Từ chối hoàn hàng
function rejectReturn(reqId) {
    Swal.fire({
        title: 'Từ chối hoàn hàng?',
        text: `Bạn có chắc chắn muốn TỪ CHỐI yêu cầu hoàn hàng cho đơn "${reqId}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#E53E3E',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Từ chối',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            const index = returns.findIndex(r => r.id === reqId);
            if (index !== -1) {
                returns[index].status = 'Từ chối';
                filterAndRender();
                Swal.fire({
                    title: 'Đã từ chối!',
                    text: 'Yêu cầu hoàn hàng đã bị từ chối.',
                    icon: 'info',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
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

// Hàm xử lý Lọc & Tìm kiếm
function filterAndRender() {
    const keyword = searchInput.value.toLowerCase();
    const status = statusFilter.value;
    
    const filteredReturns = returns.filter(r => {
        const matchKeyword = r.user.toLowerCase().includes(keyword) || 
                             r.id.toLowerCase().includes(keyword) ||
                             r.reason.toLowerCase().includes(keyword) ||
                             r.detail.toLowerCase().includes(keyword);
        const matchStatus = status === 'all' || r.status === status;
        
        return matchKeyword && matchStatus;
    });
    
    renderTable(filteredReturns);
}

searchInput.addEventListener('input', filterAndRender);
statusFilter.addEventListener('change', filterAndRender);

// Render dữ liệu ban đầu
document.addEventListener('DOMContentLoaded', () => {
    renderTable(returns);
});
