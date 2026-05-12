/**
 * nhapemail.js
 * Bước 1 của luồng quên mật khẩu: nhập email → gửi OTP
 *
 * API: POST /api/auth/forgot-password
 * Body: { email }
 * Response: { success, message, otp } (otp chỉ trả về khi dev/mock)
 *
 * Sau khi thành công → lưu email vào sessionStorage → chuyển sang nhapmaOtp.html
 */

const API_URL = 'http://localhost:3005/api';

document.addEventListener('DOMContentLoaded', () => {
    const form    = document.getElementById('forgot-form');
    const btnSend = document.getElementById('btn-send');
    const msgEl   = document.getElementById('msg');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        if (!email) return;

        // Trạng thái loading
        btnSend.disabled = true;
        btnSend.innerHTML = `
            <span class="material-symbols-outlined" style="font-size:18px;animation:spin 1s linear infinite;">progress_activity</span>
            Đang gửi...
        `;
        showMsg('', '');

        try {
            const res  = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const json = await res.json();

            if (json.success) {
                // Lưu email để dùng ở bước tiếp theo
                sessionStorage.setItem('reset_email', email);

                // Nếu BE trả về OTP (mock/dev) thì lưu để điền sẵn
                if (json.otp) {
                    sessionStorage.setItem('reset_otp_hint', json.otp);
                }

                showMsg(`✓ ${json.message}`, 'success');

                // Chuyển sang trang nhập OTP sau 1.2 giây
                setTimeout(() => {
                    window.location.href = 'nhapmaOtp.html';
                }, 1200);
            } else {
                showMsg(json.message || 'Có lỗi xảy ra. Vui lòng thử lại.', 'error');
                resetBtn();
            }
        } catch (err) {
            console.error('forgot-password error:', err);
            showMsg('Không thể kết nối server. Vui lòng thử lại.', 'error');
            resetBtn();
        }

        function resetBtn() {
            btnSend.disabled = false;
            btnSend.innerHTML = `
                Gửi Mã Xác Thực
                <span class="material-symbols-outlined" style="font-size:18px;">send</span>
            `;
        }

        function showMsg(text, type) {
            if (!msgEl) return;
            msgEl.textContent = text;
            msgEl.style.display = text ? 'block' : 'none';
            msgEl.style.color   = type === 'success' ? '#2e7d32' : '#b52424';
            msgEl.style.background = type === 'success' ? '#f0fdf4' : '#fff5f5';
        }
    });
});
