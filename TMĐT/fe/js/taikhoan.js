/**
 * taikhoan.js
 * Lấy và cập nhật thông tin tài khoản người dùng
 *
 * API:
 *   GET /api/auth/me          - Lấy thông tin user
 *   PUT /api/auth/me          - Cập nhật ten, soDienThoai, diaChi
 */

const API_URL = 'http://localhost:3005/api';

// ─── Khởi động ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'dangnhap.html';
        return;
    }
    await loadUserInfo();
    setupForm();
});

// ─── Load thông tin user ──────────────────────────────────────────────────────
async function loadUserInfo() {
    const token = localStorage.getItem('token');
    try {
        const res  = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();

        if (!json.success) {
            showToast('Không thể tải thông tin tài khoản.', 'error');
            return;
        }

        const u = json.data;

        // Điền vào form
        document.getElementById('input-ten').value         = u.ten         || '';
        document.getElementById('input-email').value       = u.email       || '';
        document.getElementById('input-sdt').value         = u.soDienThoai || '';
        document.getElementById('input-diachi').value      = u.diaChi      || '';

        // Sidebar
        const nameEl = document.getElementById('sidebar-name');
        const joinEl = document.getElementById('sidebar-join');
        if (nameEl) nameEl.textContent = u.ten;
        if (joinEl && u.ngayTao) {
            joinEl.textContent = `Thành viên từ ${new Date(u.ngayTao).getFullYear()}`;
        }

        // Cập nhật localStorage
        localStorage.setItem('user', JSON.stringify({
            id:          u.id,
            ten:         u.ten,
            email:       u.email,
            soDienThoai: u.soDienThoai,
            role:        u.vaiTro
        }));

    } catch (err) {
        console.error('loadUserInfo error:', err);
        showToast('Không thể kết nối server.', 'error');
    }
}

// ─── Setup form submit & hủy ─────────────────────────────────────────────────
function setupForm() {
    const form    = document.getElementById('profile-form');
    const btnHuy  = document.getElementById('btn-huy');

    // Lưu giá trị gốc để reset khi hủy
    let originalValues = {};
    const saveOriginal = () => {
        originalValues = {
            ten:    document.getElementById('input-ten').value,
            sdt:    document.getElementById('input-sdt').value,
            diachi: document.getElementById('input-diachi').value
        };
    };
    saveOriginal();

    // Nút hủy → khôi phục giá trị gốc
    if (btnHuy) {
        btnHuy.addEventListener('click', () => {
            document.getElementById('input-ten').value    = originalValues.ten;
            document.getElementById('input-sdt').value    = originalValues.sdt;
            document.getElementById('input-diachi').value = originalValues.diachi;
            showToast('Đã hủy thay đổi.');
        });
    }

    // Submit form
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveUserInfo();
            saveOriginal(); // Cập nhật giá trị gốc sau khi lưu thành công
        });
    }
}

// ─── Lưu thông tin ───────────────────────────────────────────────────────────
async function saveUserInfo() {
    const token  = localStorage.getItem('token');
    const ten    = document.getElementById('input-ten').value.trim();
    const sdt    = document.getElementById('input-sdt').value.trim();
    const diaChi = document.getElementById('input-diachi').value.trim();
    const matKhau = document.getElementById('input-pass').value;
    const confirmPass = document.getElementById('input-pass-confirm').value;

    if (!ten) {
        showToast('Họ tên không được để trống.', 'error');
        return;
    }

    if (matKhau || confirmPass) {
        if (matKhau !== confirmPass) {
            showToast('Mật khẩu xác nhận không khớp.', 'error');
            return;
        }
        if (matKhau.length < 6) {
            showToast('Mật khẩu phải có ít nhất 6 ký tự.', 'error');
            return;
        }
    }

    const btnSave = document.getElementById('btn-save');
    if (btnSave) {
        btnSave.disabled = true;
        btnSave.textContent = 'ĐANG LƯU...';
    }

    try {
        const payload = { ten, soDienThoai: sdt, diaChi };
        if (matKhau) payload.matKhau = matKhau;

        console.log('--- Frontend: Sending Profile Update ---');
        console.log('Payload:', payload);
        
        const res  = await fetch(`${API_URL}/auth/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        const json = await res.json();

        if (json.success) {
            // Cập nhật sidebar và localStorage
            const nameEl = document.getElementById('sidebar-name');
            if (nameEl) nameEl.textContent = json.data.ten;

            localStorage.setItem('user', JSON.stringify({
                id:          json.data.id,
                ten:         json.data.ten,
                email:       json.data.email,
                soDienThoai: json.data.soDienThoai,
                role:        json.data.role
            }));

            showToast('Đã lưu thông tin thành công!');
            document.getElementById('input-pass').value = '';
            document.getElementById('input-pass-confirm').value = '';
        } else {
            showToast(json.message || 'Cập nhật thất bại.', 'error');
        }
    } catch (err) {
        console.error('saveUserInfo error:', err);
        showToast('Không thể kết nối server.', 'error');
    } finally {
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.textContent = 'LƯU THÔNG TIN';
        }
    }
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
    const existing = document.getElementById('toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = `fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all
        ${type === 'error' ? 'bg-red-600' : 'bg-stone-800'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
