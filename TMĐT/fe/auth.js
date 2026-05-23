document.addEventListener('DOMContentLoaded', () => {
    // 1. Kiểm tra trạng thái đăng nhập
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    const guestMenu = document.getElementById('guest-menu');
    const userMenu = document.getElementById('user-menu');

    if (guestMenu && userMenu) {
        if (token && user) {
            guestMenu.classList.add('hidden');
            userMenu.classList.remove('hidden');
        } else {
            guestMenu.classList.remove('hidden');
            userMenu.classList.add('hidden');
        }
    }

    // 2. Xử lý đăng xuất (Tìm tất cả các link Đăng xuất trên trang)
    document.querySelectorAll('a').forEach(link => {
        const text = link.textContent.trim();
        if (text.includes('Đăng xuất') || (link.href.includes('trangchu.html') && link.querySelector('.material-symbols-outlined')?.textContent === 'logout')) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                alert('Đã đăng xuất!');
                window.location.href = 'trangchu.html';
            });
        }
    });
    // 3. Cập nhật số lượng giỏ hàng
    updateCartCount();

    function updateCartCount() {
        const cartCountEl = document.getElementById('cart-count');

        if (!token) {
            if (cartCountEl) cartCountEl.classList.add('hidden');
            return;
        }

        fetch('http://localhost:3005/api/cart', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => {
            if (res.status === 401 || res.status === 403) {
                // Token không hợp lệ hoặc database đã bị reset!
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.reload();
                return null;
            }
            return res.json();
        })
        .then(json => {
            if (!json || !cartCountEl) return;
            if (json.success && json.data && json.data.items) {
                const count = json.data.items.reduce((sum, item) => sum + item.soLuong, 0);
                if (count > 0) {
                    cartCountEl.textContent = count;
                    cartCountEl.classList.remove('hidden');
                } else {
                    cartCountEl.classList.add('hidden');
                }
            }
        })
        .catch(err => console.error('Error fetching cart count:', err));
    }

    // Expose updateCartCount globally for use in other scripts
    window.updateCartCount = updateCartCount;
});
