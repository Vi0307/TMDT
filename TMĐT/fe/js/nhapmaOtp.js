/**
 * nhapmaOtp.js
 * Bước 2 của luồng quên mật khẩu: nhập OTP → xác thực
 *
 * API: POST /api/auth/verify-otp
 * Body: { email, otp }
 *
 * Sau khi thành công → lưu otp vào sessionStorage → chuyển sang datlaimk.html
 */

const API_URL = 'http://localhost:3005/api';

// ─── Khởi động ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const email = sessionStorage.getItem('reset_email');

    // Nếu không có email → quay lại bước 1
    if (!email) {
        window.location.href = 'nhapemail.html';
        return;
    }

    // Hiển thị email
    document.getElementById('email-display').textContent = email;

    // Nếu có OTP hint từ mock → điền sẵn
    const otpHint = sessionStorage.getItem('reset_otp_hint');
    if (otpHint) {
        const inputs = document.querySelectorAll('.otp-input');
        otpHint.split('').forEach((c, i) => {
            if (inputs[i]) {
                inputs[i].value = c;
                inputs[i].classList.add('filled');
            }
        });
    }

    setupOtpInputs();
    startTimer();
    setupForm(email);
});

// ─── Setup OTP inputs ─────────────────────────────────────────────────────────
function setupOtpInputs() {
    const inputs = document.querySelectorAll('.otp-input');

    inputs.forEach((inp, i) => {
        inp.addEventListener('input', () => {
            inp.value = inp.value.replace(/\D/g, '');
            if (inp.value) {
                inp.classList.add('filled');
                if (i < inputs.length - 1) inputs[i + 1].focus();
            } else {
                inp.classList.remove('filled');
            }
        });

        inp.addEventListener('keydown', e => {
            if (e.key === 'Backspace' && !inp.value && i > 0) {
                inputs[i - 1].focus();
            }
        });

        inp.addEventListener('paste', e => {
            const data = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            data.split('').forEach((c, j) => {
                if (inputs[j]) {
                    inputs[j].value = c;
                    inputs[j].classList.add('filled');
                }
            });
            e.preventDefault();
            // Focus ô cuối cùng được điền
            const lastIdx = Math.min(data.length, inputs.length - 1);
            inputs[lastIdx].focus();
        });
    });
}

// ─── Timer đếm ngược ─────────────────────────────────────────────────────────
let timerInterval = null;

function startTimer(seconds = 120) {
    let secs = seconds;
    const timerEl   = document.getElementById('timer');
    const resendBtn = document.getElementById('resend-btn');

    clearInterval(timerInterval);
    timerEl.style.color = '#805600';
    resendBtn.classList.remove('visible');

    timerInterval = setInterval(() => {
        secs--;
        const m = String(Math.floor(secs / 60)).padStart(2, '0');
        const s = String(secs % 60).padStart(2, '0');
        timerEl.textContent = `${m}:${s}`;

        if (secs <= 0) {
            clearInterval(timerInterval);
            timerEl.textContent = '00:00';
            timerEl.style.color = '#b52424';
            resendBtn.classList.add('visible');
        }
    }, 1000);
}

// ─── Gửi lại OTP ─────────────────────────────────────────────────────────────
async function resendOtp() {
    const email = sessionStorage.getItem('reset_email');
    if (!email) return;

    const resendBtn = document.getElementById('resend-btn');
    resendBtn.textContent = 'Đang gửi...';
    resendBtn.disabled = true;

    try {
        const res  = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const json = await res.json();

        if (json.success) {
            // Cập nhật OTP hint nếu có
            if (json.otp) sessionStorage.setItem('reset_otp_hint', json.otp);

            // Xóa các ô OTP cũ
            document.querySelectorAll('.otp-input').forEach(inp => {
                inp.value = '';
                inp.classList.remove('filled');
            });
            document.querySelectorAll('.otp-input')[0]?.focus();

            showMsg('Đã gửi lại mã OTP!', 'success');
            startTimer(120);
        } else {
            showMsg(json.message || 'Không thể gửi lại OTP.', 'error');
        }
    } catch {
        showMsg('Không thể kết nối server.', 'error');
    } finally {
        resendBtn.textContent = 'Gửi lại';
        resendBtn.disabled = false;
    }
}

// ─── Submit form xác thực OTP ─────────────────────────────────────────────────
function setupForm(email) {
    const form    = document.getElementById('otp-form');
    const btnVerify = document.getElementById('btn-verify');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const inputs = document.querySelectorAll('.otp-input');
        const otp    = [...inputs].map(i => i.value).join('');

        if (otp.length < 6) {
            showMsg('Vui lòng nhập đủ 6 chữ số.', 'error');
            return;
        }

        // Loading
        btnVerify.disabled = true;
        btnVerify.innerHTML = `
            <span class="material-symbols-outlined" style="font-size:18px;animation:spin 1s linear infinite;">progress_activity</span>
            Đang xác thực...
        `;
        showMsg('', '');

        try {
            const res  = await fetch(`${API_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            const json = await res.json();

            if (json.success) {
                // Lưu OTP đã xác thực để dùng ở bước 3
                sessionStorage.setItem('reset_otp', otp);
                sessionStorage.removeItem('reset_otp_hint');

                showMsg('✓ Xác thực thành công! Đang chuyển trang...', 'success');
                clearInterval(timerInterval);

                setTimeout(() => {
                    window.location.href = 'datlaimk.html';
                }, 1000);
            } else {
                showMsg(json.message || 'Mã OTP không hợp lệ.', 'error');
                // Shake animation
                inputs.forEach(inp => {
                    inp.style.borderColor = '#b52424';
                    setTimeout(() => inp.style.borderColor = '', 1500);
                });
                btnVerify.disabled = false;
                btnVerify.innerHTML = `
                    Xác Nhận Mã
                    <span class="material-symbols-outlined" style="font-size:18px;">arrow_forward</span>
                `;
            }
        } catch {
            showMsg('Không thể kết nối server.', 'error');
            btnVerify.disabled = false;
            btnVerify.innerHTML = `
                Xác Nhận Mã
                <span class="material-symbols-outlined" style="font-size:18px;">arrow_forward</span>
            `;
        }
    });
}

// ─── Thông báo ────────────────────────────────────────────────────────────────
function showMsg(text, type) {
    const msgEl = document.getElementById('msg');
    if (!msgEl) return;
    msgEl.textContent    = text;
    msgEl.style.display  = text ? 'block' : 'none';
    msgEl.style.color    = type === 'success' ? '#2e7d32' : '#b52424';
    msgEl.style.background = type === 'success' ? '#f0fdf4' : '#fff5f5';
}
