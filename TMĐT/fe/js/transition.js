/**
 * transition.js
 * Bản lập trình chuyển đổi trang mượt mà cao cấp "Màn Sương Khói Hội An" (Ancient Fog Transition) - Phiên bản Tối ưu hóa Siêu tốc (60 FPS)
 * Tự động tiêm (inject) CSS/HTML Overlay bằng MutationObserver trước khi vẽ trang (First Paint), triệt tiêu chớp màn hình trắng.
 */

(function() {
    // 1. Tiêm CSS chuyển trang nghệ thuật vào head của trang web lập tức
    const css = `
        .page-transition-overlay {
            position: fixed;
            inset: 0;
            background-color: #fbf9f4; /* Màu kem tơ tằm Hội An ấm áp */
            z-index: 99999;
            opacity: 1;
            visibility: visible;
            transition: opacity 0.38s cubic-bezier(0.25, 1, 0.5, 1), visibility 0.38s cubic-bezier(0.25, 1, 0.5, 1);
            pointer-events: auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 20px;
            will-change: opacity;
            transform: translateZ(0); /* Kích hoạt tăng tốc phần cứng GPU */
        }
        .dark .page-transition-overlay {
            background-color: #0c0a09; /* Màu tối trong dark mode */
        }
        .page-transition-overlay.hidden-transition {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }
        .page-transition-lantern {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background-color: #b52424;
            box-shadow: 0 0 20px rgba(181, 36, 36, 0.7);
            animation: pulse-lantern 1.4s infinite ease-in-out;
            position: relative;
        }
        .page-transition-lantern::after {
            content: '';
            position: absolute;
            inset: -8px;
            border-radius: 50%;
            border: 1px solid rgba(229, 160, 34, 0.45);
            animation: pulse-ring 1.4s infinite ease-in-out;
        }
        @keyframes pulse-lantern {
            0%, 100% { transform: scale(0.9); opacity: 0.8; box-shadow: 0 0 12px rgba(181, 36, 36, 0.6); }
            50% { transform: scale(1.08); opacity: 1; box-shadow: 0 0 25px rgba(181, 36, 36, 0.9); }
        }
        @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.8; }
            100% { transform: scale(1.4); opacity: 0; }
        }
        .page-transition-text {
            font-family: 'Noto Serif', serif;
            font-size: 13px;
            letter-spacing: 0.28em;
            color: #4a2c2a;
            font-weight: 600;
            text-transform: uppercase;
            text-shadow: 0 2px 4px rgba(74, 44, 42, 0.05);
            animation: pulse-text 1.4s infinite ease-in-out;
        }
        .dark .page-transition-text {
            color: #eabcb8;
        }
        @keyframes pulse-text {
            0%, 100% { opacity: 0.7; }
            50% { opacity: 1; }
        }
    `;
    const styleEl = document.createElement('style');
    styleEl.innerHTML = css;
    document.head.appendChild(styleEl);

    // 2. Tiêm HTML chuyển trang vào trang web ngay khi body sẵn sàng bằng MutationObserver
    function injectOverlay() {
        if (document.getElementById('page-transition-overlay')) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'page-transition-overlay';
        overlay.className = 'page-transition-overlay';
        overlay.innerHTML = `
            <div class="page-transition-lantern"></div>
            <span class="page-transition-text">Hội An Tinh Hoa</span>
        `;
        document.body.prepend(overlay);
    }

    // Thiết lập MutationObserver để tiêm overlay ngay khi body được chèn vào DOM (trước khi vẽ trang)
    if (document.body) {
        injectOverlay();
    } else {
        const observer = new MutationObserver((mutations, obs) => {
            if (document.body) {
                injectOverlay();
                obs.disconnect(); // Đã tiêm thành công, ngừng theo dõi
            }
        });
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    // 3. Ẩn màn sương mượt mà sau khi trang đã tải xong (nhường luồng chính cho các script khác ổn định)
    function hideOverlay() {
        const overlay = document.getElementById('page-transition-overlay');
        if (!overlay) return;

        // Tránh chạy nhiều lần nếu đã ẩn
        if (overlay.classList.contains('hidden-transition')) return;

        // Sử dụng requestAnimationFrame kép + setTimeout giúp giải phóng hoàn toàn main thread trước khi chạy hoạt họa
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setTimeout(() => {
                    overlay.classList.add('hidden-transition');
                }, 150); // Trì hoãn nhẹ 150ms để layout trang ổn định hoàn toàn
            });
        });
    }

    // Kiểm tra trạng thái tải trang
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        hideOverlay();
    } else {
        window.addEventListener('DOMContentLoaded', hideOverlay);
        window.addEventListener('load', hideOverlay);
    }

    // 4. Lắng nghe sự kiện click trên toàn bộ liên kết chuyển trang để kích hoạt Fade Out
    document.addEventListener('DOMContentLoaded', () => {
        document.body.addEventListener('click', (e) => {
            // Tìm thẻ <a> gần nhất
            const link = e.target.closest('a');
            if (!link) return;

            // Bỏ qua nếu người dùng click bằng các phím bổ trợ hệ thống (Ctrl, Cmd, Shift, Alt để mở tab mới)
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

            const href = link.getAttribute('href');
            if (!href) return;

            // Bỏ qua các loại liên kết đặc biệt hoặc mở tab mới
            if (href.startsWith('#') || 
                href.startsWith('javascript:') || 
                href.startsWith('mailto:') || 
                href.startsWith('tel:') || 
                link.target === '_blank' || 
                link.hasAttribute('download')) {
                return;
            }

            // Phân tích và kiểm tra URL nội bộ an toàn bằng đối tượng URL
            try {
                const url = new URL(link.href, window.location.href);
                if (url.origin === window.location.origin) {
                    const pathname = url.pathname;
                    
                    // Kích hoạt transition cho các file .html hoặc thư mục gốc (đường dẫn tương thích query string)
                    if (pathname.endsWith('.html') || pathname === '/' || pathname === '') {
                        // Tránh tự chuyển cảnh trên cùng một trang nếu chỉ thay đổi hashtag (#)
                        if (url.pathname === window.location.pathname && url.hash) {
                            return;
                        }

                        e.preventDefault();

                        // Kích hoạt lớp phủ hiển thị lại
                        const overlay = document.getElementById('page-transition-overlay');
                        if (overlay) {
                            overlay.classList.remove('hidden-transition');
                        }

                        // Xử lý sự kiện Đăng xuất đặc biệt nếu có
                        const isLogout = href.includes('trangchu.html') && link.textContent.trim() === 'Đăng xuất';

                        // Chờ 350ms (phủ kín màn sương hoàn hảo) rồi mới bắt đầu chuyển hướng
                        setTimeout(() => {
                            if (isLogout && typeof authLogout === 'function') {
                                authLogout();
                            }
                            window.location.href = link.href;
                        }, 350);
                    }
                }
            } catch (err) {
                // Bỏ qua nếu có lỗi phân tích URL
            }
        });
    });

    // 5. Đồng bộ hóa với BFCache (Back-Forward Cache) để tránh kẹt lớp phủ khi nhấn Back/Forward
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            const overlay = document.getElementById('page-transition-overlay');
            if (overlay) {
                overlay.classList.add('hidden-transition');
            }
        }
    });
})();
