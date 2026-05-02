const API_URL = 'http://localhost:3000/api/admin/users';

const userTableBody = document.getElementById('userTableBody');
const searchInput = document.getElementById('searchInput');

// Lấy danh sách người dùng
async function loadUsers(search = '') {
    userTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#A0AEC0;">Đang tải...</td></tr>`;
    try {
        const url = search ? `${API_URL}?search=${encodeURIComponent(search)}` : API_URL;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.success) {
            renderTable(json.data);
        } else {
            userTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;padding:40px;">Lỗi: ${json.message}</td></tr>`;
        }
    } catch (err) {
        console.error('loadUsers error:', err);
        userTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;padding:40px;">Không thể kết nối server. (${err.message})</td></tr>`;
    }
}

// Render bảng
function renderTable(data) {
    userTableBody.innerHTML = '';

    if (data.length === 0) {
        userTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#A0AEC0;">Không tìm thấy người dùng nào.</td></tr>`;
        return;
    }

    data.forEach(user => {
        const isActive = user.trangThai === 'Hoạt động';
        const statusHtml = isActive
            ? `<span class="status-badge status-active">Hoạt động</span>`
            : `<span class="status-badge status-locked">Đã khóa</span>`;

        const actionHtml = isActive
            ? `<button class="btn-action btn-lock" onclick="toggleStatus(${user.maNguoiDung}, true)" title="Khóa tài khoản"><i class="ph ph-lock-key"></i></button>`
            : `<button class="btn-action btn-unlock" onclick="toggleStatus(${user.maNguoiDung}, false)" title="Mở khóa"><i class="ph ph-lock-key-open"></i></button>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${user.maNguoiDung}</strong></td>
            <td>${user.ten}</td>
            <td>${user.email}</td>
            <td>${user.soDienThoai || ''}</td>
            <td>${statusHtml}</td>
            <td>${user.diaChi || ''}</td>
            <td class="actions">${actionHtml}</td>
        `;
        userTableBody.appendChild(tr);
    });
}

// Khóa / Mở khóa tài khoản
async function toggleStatus(userId, isCurrentlyActive) {
    const actionText = isCurrentlyActive ? 'Khóa' : 'Mở khóa';
    const newStatus = isCurrentlyActive ? 'Đã khóa' : 'Hoạt động';

    const result = await Swal.fire({
        title: `Xác nhận ${actionText}?`,
        text: `Bạn có chắc muốn ${actionText.toLowerCase()} tài khoản này không?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: isCurrentlyActive ? '#DD6B20' : '#38A169',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Đồng ý',
        cancelButtonText: 'Hủy'
    });

    if (!result.isConfirmed) return;

    try {
        const res = await fetch(`${API_URL}/${userId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trangThai: newStatus })
        });
        const json = await res.json();
        if (json.success) {
            Swal.fire({ title: 'Thành công!', icon: 'success', timer: 1500, showConfirmButton: false });
            loadUsers(searchInput.value);
        }
    } catch {
        Swal.fire({ title: 'Lỗi!', text: 'Không thể cập nhật.', icon: 'error' });
    }
}

// Tìm kiếm debounce
let searchTimeout;
searchInput.addEventListener('input', function () {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadUsers(this.value), 300);
});

document.addEventListener('DOMContentLoaded', () => loadUsers());
