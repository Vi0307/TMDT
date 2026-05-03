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

    // 2. Xử lý đăng xuất
    if (userMenu) {
        const logoutLink = userMenu.querySelector('a[href="trangchu.html"]');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                alert('Đã đăng xuất!');
                window.location.href = 'trangchu.html';
            });
        }
    }
});
