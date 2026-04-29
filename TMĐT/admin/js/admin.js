// Dữ liệu mẫu (Mock data)
let users = [
    {
        id: "U001",
        name: "Nguyễn Văn A",
        email: "nguyenvana@gmail.com",
        phone: "0901234567",
        status: "active",
        createdAt: "12/03/2024"
    },
    {
        id: "U002",
        name: "Trần Thị B",
        email: "tranthib@gmail.com",
        phone: "0912345678",
        status: "active",
        createdAt: "15/03/2024"
    },
    {
        id: "U003",
        name: "Lê Văn C",
        email: "levanc@gmail.com",
        phone: "0923456789",
        status: "locked",
        createdAt: "20/03/2024"
    },
    {
        id: "U004",
        name: "Phạm Thị D",
        email: "phamthid@gmail.com",
        phone: "0934567890",
        status: "active",
        createdAt: "22/03/2024"
    }
];

const userTableBody = document.getElementById('userTableBody');
const searchInput = document.getElementById('searchInput');

// Hàm render bảng dữ liệu
function renderTable(data) {
    userTableBody.innerHTML = '';
    
    if (data.length === 0) {
        userTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 40px; color:#A0AEC0; font-size: 15px;">Không tìm thấy người dùng nào.</td></tr>`;
        return;
    }

    data.forEach(user => {
        const tr = document.createElement('tr');
        
        // Cột trạng thái
        let statusHtml = '';
        if (user.status === 'active') {
            statusHtml = `<span class="status-badge status-active">Hoạt động</span>`;
        } else {
            statusHtml = `<span class="status-badge status-locked">Đã khóa</span>`;
        }
        
        // Cột thao tác
        let actionHtml = '';
        if (user.status === 'active') {
            actionHtml += `<button class="btn-action btn-lock" onclick="toggleStatus('${user.id}')" title="Khóa tài khoản"><i class="ph ph-lock-key"></i></button>`;
        } else {
            actionHtml += `<button class="btn-action btn-unlock" onclick="toggleStatus('${user.id}')" title="Mở khóa tài khoản"><i class="ph ph-lock-key-open"></i></button>`;
        }
        actionHtml += `<button class="btn-action btn-delete" onclick="deleteUser('${user.id}')" title="Xóa tài khoản"><i class="ph ph-trash"></i></button>`;

        tr.innerHTML = `
            <td><strong>${user.id}</strong></td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.phone}</td>
            <td>${statusHtml}</td>
            <td>${user.createdAt}</td>
            <td class="actions">${actionHtml}</td>
        `;
        
        userTableBody.appendChild(tr);
    });
}

// Hàm đổi trạng thái có Popup (SweetAlert2)
function toggleStatus(userId) {
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
        const isCurrentlyActive = users[userIndex].status === 'active';
        const actionText = isCurrentlyActive ? 'Khóa' : 'Mở khóa';
        const confirmColor = isCurrentlyActive ? '#DD6B20' : '#38A169';

        Swal.fire({
            title: `Xác nhận ${actionText}?`,
            text: `Bạn có chắc chắn muốn ${actionText.toLowerCase()} tài khoản ${userId} không?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: confirmColor,
            cancelButtonColor: '#A0AEC0',
            confirmButtonText: `Đồng ý`,
            cancelButtonText: 'Hủy'
        }).then((result) => {
            if (result.isConfirmed) {
                users[userIndex].status = isCurrentlyActive ? 'locked' : 'active';
                renderTable(users);
                
                Swal.fire({
                    title: 'Thành công!',
                    text: `Tài khoản ${userId} đã được ${actionText.toLowerCase()}.`,
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        });
    }
}

// Hàm xóa người dùng có Popup (SweetAlert2)
function deleteUser(userId) {
    Swal.fire({
        title: 'Bạn có chắc chắn?',
        text: `Tài khoản ${userId} sẽ bị xóa vĩnh viễn!`,
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#E53E3E',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Hủy bỏ'
    }).then((result) => {
        if (result.isConfirmed) {
            users = users.filter(u => u.id !== userId);
            renderTable(users);
            
            Swal.fire({
                title: 'Đã xóa!',
                text: `Tài khoản ${userId} đã được xóa khỏi hệ thống.`,
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
            }).then(() => {
                // Tích hợp logic chuyển hướng sau
                console.log("Logged out");
            });
        }
    });
}

// Hàm tìm kiếm
searchInput.addEventListener('input', function() {
    const keyword = this.value.toLowerCase();
    const filteredUsers = users.filter(user => 
        user.name.toLowerCase().includes(keyword) || 
        user.email.toLowerCase().includes(keyword) ||
        user.phone.includes(keyword) ||
        user.id.toLowerCase().includes(keyword)
    );
    renderTable(filteredUsers);
});

// Render dữ liệu ban đầu
document.addEventListener('DOMContentLoaded', () => {
    renderTable(users);
});
