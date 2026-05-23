/**
 * huydon.js
 * Xử lý hủy đơn hàng với lý do cụ thể
 */

const API_URL = 'http://localhost:3005/api';
let currentOrderId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    currentOrderId = params.get('id');
    const fromTab = params.get('fromTab') || 'all';

    if (!currentOrderId) {
        window.location.href = `donhangcuatoi.html?tab=${fromTab}`;
        return;
    }

    updateBackLinks();
    await loadOrderInfo();
});

function updateBackLinks() {
    const params = new URLSearchParams(window.location.search);
    const fromTab = params.get('fromTab') || 'all';
    
    // Thẻ <a> quay lại
    const backLinks = document.querySelectorAll('a[href*="donhangcuatoi.html"]');
    backLinks.forEach(link => {
        link.href = `donhangcuatoi.html?tab=${fromTab}`;
    });

    // Nút QUAY LẠI bằng button onclick (cải tiến selector chống lệch nháy đơn/kép)
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        const clickAttr = btn.getAttribute('onclick');
        if (clickAttr && clickAttr.includes('donhangcuatoi.html')) {
            btn.setAttribute('onclick', `window.location.href='donhangcuatoi.html?tab=${fromTab}'`);
        }
    });
}

async function loadOrderInfo() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/orders/${currentOrderId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();

        if (json.success) {
            const order = json.data;
            document.getElementById('order-id-display').textContent = `Mã đơn hàng: #${order.maDonHang}`;
            
            // Format ngày
            const datePart = (order.ngayDat + '').split('T')[0];
            const [y, m, d] = datePart.split('-');
            document.getElementById('order-date-display').textContent = `Ngày đặt: ${d}/${m}/${y}`;
            
            document.getElementById('order-total-display').textContent = Number(order.tongTien).toLocaleString('vi-VN') + '₫';
        }
    } catch (err) {
        console.error('loadOrderInfo error:', err);
    }
}

async function handleCancelConfirm() {
    const selectedReason = document.querySelector('input[name="reason"]:checked').parentElement.querySelector('span').textContent;
    const extraInfo = document.getElementById('cancel-reason-text').value.trim();
    const lyDoHuy = extraInfo ? `${selectedReason}: ${extraInfo}` : selectedReason;

    const token = localStorage.getItem('token');
    const btn = document.querySelector('button[onclick="handleCancelConfirm()"]');
    
    if (btn) btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/orders/${currentOrderId}/cancel`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ lyDoHuy })
        });
        const json = await res.json();

        if (json.success) {
            showNotification('Hủy đơn hàng thành công', 'Đơn hàng của bạn đã được hủy. Tiền sẽ được hoàn lại (nếu có) trong vòng 3-5 ngày.');
            const params = new URLSearchParams(window.location.search);
            const fromTab = params.get('fromTab') || 'all';
            setTimeout(() => {
                window.location.href = `donhangcuatoi.html?tab=${fromTab}`;
            }, 2000);
        } else {
            showNotification('Lỗi', json.message || 'Không thể hủy đơn hàng.', 'error');
            if (btn) btn.disabled = false;
        }
    } catch (err) {
        console.error('handleCancelConfirm error:', err);
        showNotification('Lỗi', 'Không thể kết nối server.', 'error');
        if (btn) btn.disabled = false;
    }
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
        toast.style.borderLeftColor = '#b52424';
        icon.textContent = 'check_circle';
        icon.style.color = '#b52424';
    }

    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}
