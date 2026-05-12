/**
 * mathanhtoan.js
 * Xử lý xác nhận mã OTP và hiển thị thông tin đơn hàng
 */

const API_URL = 'http://localhost:3005/api';
let currentOrderId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    currentOrderId = params.get('id');

    if (!currentOrderId) {
        window.location.href = 'trangchu.html';
        return;
    }

    await loadOrderInfo();
    setupPinLogic();
});

async function loadOrderInfo() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/orders/${currentOrderId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();

        if (json.success) {
            const order = json.data;
            document.getElementById('display-amount').textContent = Number(order.tongTien).toLocaleString('vi-VN') + ' đ';
        }
    } catch (err) {
        console.error('loadOrderInfo error:', err);
    }
}

function setupPinLogic() {
    const inputs = document.querySelectorAll('#pin-inputs input');

    inputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            if (input.value && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && index > 0) {
                inputs[index - 1].focus();
            }
        });
    });

    // Virtual keypad logic
    const keypadBtns = document.querySelectorAll('.keypad-btn');
    const backspaceBtn = document.getElementById('keypad-backspace');

    keypadBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const num = btn.innerText.trim();
            for (let i = 0; i < inputs.length; i++) {
                if (!inputs[i].value) {
                    inputs[i].value = num;
                    if (i < inputs.length - 1) inputs[i + 1].focus();
                    else inputs[i].focus();
                    break;
                }
            }
        });
    });

    backspaceBtn.addEventListener('click', () => {
        for (let i = inputs.length - 1; i >= 0; i--) {
            if (inputs[i].value) {
                inputs[i].value = '';
                inputs[i].focus();
                break;
            } else if (i === 0) {
                inputs[0].focus();
            }
        }
    });
}

function handleConfirm() {
    const pin = Array.from(document.querySelectorAll('#pin-inputs input')).map(i => i.value).join('');
    if (pin.length < 6) {
        showNotification('Lỗi', 'Vui lòng nhập đầy đủ mã PIN 6 số.', 'error');
        return;
    }

    // Giả lập kiểm tra số dư và OTP
    showNotification('Thanh toán thành công', 'Cảm ơn bạn đã tin tưởng Hội An Tinh Hoa. Đơn hàng của bạn đang được xử lý.');
    
    setTimeout(() => {
        window.location.href = 'donhangcuatoi.html';
    }, 2000);
}

function showNotification(title, message, type = 'success') {
    const toast = document.getElementById('notification-toast');
    const icon = document.getElementById('notif-icon');
    const titleEl = document.getElementById('notif-title');
    const msgEl = document.getElementById('notif-message');

    titleEl.textContent = title;
    msgEl.textContent = message;
    
    if (type === 'error') {
        toast.style.borderLeftColor = '#ba1a1a';
        icon.textContent = 'error';
        icon.style.color = '#ba1a1a';
    } else {
        toast.style.borderLeftColor = '#3d8c40';
        icon.textContent = 'check_circle';
        icon.style.color = '#3d8c40';
    }

    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}
