/**
 * gioithieu.js
 * Bản lập trình chuyển động và tương tác mỹ thuật cao cấp Hội An Tinh Hoa cho trang Câu Chuyện Di Sản
 * Tích hợp: 60FPS Canvas Particles, Cursor Trails, 3D Card Tilt, Heritage Tab Switcher & Scroll Reveal
 */

/* ==========================================================================
   A. CÁC LỚP HẠT ĐỒ HỌA VÀ HIỆU ỨNG CANVAS (GRAPHICS ENGINES)
   ========================================================================== */

/**
 * 1. Vệt sáng hạt bụi vàng bám theo chuột (Golden Cursor Trail Particle)
 */
class CursorParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 2.5 + 0.6;
        this.speedX = (Math.random() - 0.5) * 1.4;
        this.speedY = (Math.random() - 0.5) * 1.4 - 0.3; // Bay nhẹ lên trên
        this.opacity = 1.0;
        this.fadeSpeed = Math.random() * 0.02 + 0.012;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.opacity -= this.fadeSpeed;
    }

    draw(ctx) {
        ctx.fillStyle = `rgba(255, 186, 71, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        if (this.size > 1.8) {
            const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3.0);
            glow.addColorStop(0, `rgba(255, 186, 71, ${this.opacity * 0.3})`);
            glow.addColorStop(1, 'rgba(255, 186, 71, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 3.0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

/**
 * 2. Đốm đom đóm lơ lửng ở Hero Canvas (Hero Sparks)
 */
class HeroSpark {
    constructor(w, h) {
        this.reset(w, h);
        this.y = Math.random() * h;
    }

    reset(w, h) {
        this.x = Math.random() * w;
        this.y = h + Math.random() * 30;
        this.size = Math.random() * 2.2 + 0.8;
        this.speedY = Math.random() * 0.4 + 0.15;
        this.angle = Math.random() * Math.PI * 2;
        this.swaySpeed = Math.random() * 0.01 + 0.005;
        this.swayWidth = Math.random() * 0.3 + 0.1;
        this.opacity = Math.random() * 0.55 + 0.15;
    }

    update(w, h) {
        this.y -= this.speedY;
        this.angle += this.swaySpeed;
        this.x += Math.sin(this.angle) * this.swayWidth;

        // Mờ dần khi lên cao gần mép trên
        if (this.y < h * 0.35) {
            this.opacity -= 0.003;
        }

        if (this.y < 0 || this.opacity <= 0) {
            this.reset(w, h);
        }
    }

    draw(ctx) {
        ctx.fillStyle = `rgba(255, 186, 71, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        if (this.size > 1.6) {
            const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3.5);
            glow.addColorStop(0, `rgba(255, 186, 71, ${this.opacity * 0.25})`);
            glow.addColorStop(1, 'rgba(255, 186, 71, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 3.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

/**
 * 3. Sao đêm nhấp nháy ở Quote Banner (Twinkling Star)
 */
class Star {
    constructor(w, h) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.maxOpacity = Math.random() * 0.7 + 0.15;
        this.opacity = Math.random() * this.maxOpacity;
        this.speed = Math.random() * 0.01 + 0.004;
        this.sign = Math.random() < 0.5 ? 1 : -1;
        this.size = Math.random() * 0.8 + 0.5;
    }

    update() {
        this.opacity += this.speed * this.sign;
        if (this.opacity >= this.maxOpacity) {
            this.opacity = this.maxOpacity;
            this.sign = -1;
        } else if (this.opacity <= 0.05) {
            this.opacity = 0.05;
            this.sign = 1;
        }
    }

    draw(ctx) {
        ctx.fillStyle = `rgba(255, 255, 235, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * 4. Hạt bụi sáng nguyện ước màu vàng cam bay ngược lên (Wish Particle)
 */
class WishParticle {
    constructor(w, h) {
        this.reset(w, h);
        this.y = Math.random() * h;
    }

    reset(w, h) {
        this.x = Math.random() * w;
        this.y = h + Math.random() * 20;
        this.size = Math.random() * 2.8 + 0.8;
        this.speedY = Math.random() * 0.7 + 0.3; // Bay nhanh hơn một chút
        this.angle = Math.random() * Math.PI * 2;
        this.swaySpeed = Math.random() * 0.02 + 0.005;
        this.swayWidth = Math.random() * 0.4 + 0.1;
        this.opacity = Math.random() * 0.7 + 0.2;
    }

    update(w, h) {
        this.y -= this.speedY;
        this.angle += this.swaySpeed;
        this.x += Math.sin(this.angle) * this.swayWidth;
        this.opacity -= 0.0025; // Nhạt dần

        if (this.y < 0 || this.opacity <= 0) {
            this.reset(w, h);
        }
    }

    draw(ctx) {
        ctx.fillStyle = `rgba(229, 160, 34, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        if (this.size > 1.8) {
            const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 4.0);
            glow.addColorStop(0, `rgba(229, 160, 34, ${this.opacity * 0.35})`);
            glow.addColorStop(1, 'rgba(229, 160, 34, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 4.0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

/* ==========================================================================
   B. VẬN HÀNH HIỆU ỨNG TƯƠNG TÁC (INTERACTION IMPLEMENTATIONS)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Quản lý Hiệu ứng Đom đóm & Vệt Chuột tại Hero
    initHeroEffects();

    // 1.2. Quản lý Slider câu chuyện di sản ở Hero Banner
    initHeroSlider();

    // 2. Quản lý Bảng tương tác Ba Làng Nghề Cổ (Tab Switcher)
    initCraftTabs();

    // 3. Quản lý Nghiêng 3D (3D Tilt Card) trên các thẻ giá trị cốt lõi
    init3DTiltCards();

    // 4. Quản lý Đêm sao & Bụi sáng nguyện ước tại Quote Banner Canvas
    initQuoteCanvas();

    // 5. Quản lý Cuộn trang kể chuyện trượt hiện (Scroll Reveal)
    initScrollReveal();
});

/**
 * Khởi tạo hiệu ứng Đom đóm và Vệt chuột trên Hero Section
 */
function initHeroEffects() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const heroSection = canvas.closest('section');
    if (!heroSection) return;

    let sparks = [];
    let trails = [];
    const maxSparks = 28;

    // Tự động căn chỉnh độ phân giải màn hình sắc nét High-DPI (Retina)
    function resizeCanvas() {
        const rect = heroSection.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        ctx.scale(dpr, dpr);

        // Khởi tạo các đốm lửa ấm áp
        sparks = [];
        for (let i = 0; i < maxSparks; i++) {
            sparks.push(new HeroSpark(rect.width, rect.height));
        }
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Lắng nghe di chuyển chuột tạo vệt sáng bụi vàng kim
    heroSection.addEventListener('mousemove', (e) => {
        const rect = heroSection.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Tạo 2 hạt bụi vàng khi chuột di chuyển
        for (let i = 0; i < 2; i++) {
            trails.push(new CursorParticle(mouseX, mouseY));
        }
        if (trails.length > 80) trails.shift(); // Giới hạn số lượng vệt chuột để bảo toàn hiệu năng
    });

    // Vòng lặp vẽ đồ họa 60FPS
    function render() {
        const rect = heroSection.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);

        // Cập nhật và vẽ đốm đom đóm
        for (let spark of sparks) {
            spark.update(rect.width, rect.height);
            spark.draw(ctx);
        }

        // Cập nhật và vẽ vệt chuột
        for (let i = trails.length - 1; i >= 0; i--) {
            trails[i].update();
            if (trails[i].opacity <= 0) {
                trails.splice(i, 1);
            } else {
                trails[i].draw(ctx);
            }
        }

        requestAnimationFrame(render);
    }
    render();
}

/**
 * Quản lý Bảng tương tác Ba Làng Nghề Cổ
 */
function initCraftTabs() {
    const tabBtns = document.querySelectorAll('.craft-tab-btn');
    const showcasePanel = document.getElementById('craft-showcase-panel');
    const craftTitle = document.getElementById('craft-title');
    const craftDesc1 = document.getElementById('craft-desc1');
    const craftQuote = document.getElementById('craft-quote');
    const craftDesc2 = document.getElementById('craft-desc2');
    const craftImg = document.getElementById('craft-img');

    if (!showcasePanel || tabBtns.length === 0) return;

    // Từ điển dữ liệu giới thiệu di sản các Làng Nghề local
    const craftData = {
        pottery: {
            title: "Gốm Thanh Hà: Hồn Đất & Lửa Cổ Kính",
            desc1: "Dòng sông Thu Bồn hiền hòa không chỉ đắp phù sa mỡ màng cho ruộng đồng phố Hội, mà còn ưu ái trao tặng người dân làng Thanh Hà loại đất sét đặc trưng có độ dẻo mịn tuyệt vời.",
            quote: `"Bàn xoay nhịp nhàng, đôi bàn tay gân guốc trân quý khẽ uốn nắn từng nếp đất vô tri mang lại cho gốm Thanh Hà hơi ấm kiêu hãnh của lòng đất mẹ Hội An cổ kính."`,
            desc2: "Trải qua quy trình nung củi gỗ truyền thống kéo dài hàng ngày đêm, những thớ gốm đón nhận sự biến chuyển sắc màu ngẫu nhiên vô giá: từ cam hồng ấm áp đến nâu đất trầm mặc lôi cuốn.",
            img: "images/thu_cong_my_nghe.png",
            alt: "Gốm Thanh Hà thủ công"
        },
        lantern: {
            title: "Đèn Lồng Phố Hội: Ánh Sáng Tâm Hồn",
            desc1: "Đèn lồng Hội An được làm kỳ công từ những thanh tre già bánh tẻ ngâm nước muối lâu ngày chống mối mọt dẻo dai kết hợp bao bọc bởi những tấm lụa tơ tằm mềm mại rực rỡ sắc màu di sản.",
            quote: `"Dưới ánh sáng ấm áp, ngọt dịu ngọt ngào lan tỏa của dàn đèn lồng huyền ảo, hồn cốt xưa cũ của phố cổ như hòa nhịp hồi sinh đầy diệu kỳ giữa màn đêm trầm mặc."`,
            desc2: "Mỗi khung đèn lồng được những bàn tay điêu luyện gọt giũa tỉ mỉ, căng tràn nếp lụa sắc sảo từ dáng đèn quả trám thanh lịch, quả bí truyền thống tới dáng bánh ú độc đáo mang phong vị quê hương.",
            img: "images/qua_luu_niem.png",
            alt: "Đèn lồng Hội An lung linh"
        },
        silk: {
            title: "Lụa Duy Xuyên: Thớ Sợi Thời Gian",
            desc1: "Men theo dòng sông Thu Bồn thơ mộng, làng nghề ươm tơ dệt lụa Duy Xuyên đã bảo lưu trọn vẹn nét văn hóa canh cửi ngàn đời bên những ruộng dâu xanh mướt làm thức ăn cho nong kén tơ tằm vàng óng.",
            quote: `"Những thớ lụa dệt mịn màng tơi tơ như dòng nước chảy trôi thơ mộng, gửi gắm tấm lòng trọn vẹn sắt son, đong đầy linh hồn di sản của các nghệ nhân đất Quảng thân thương."`,
            desc2: "Lụa tơ tằm tự nhiên đem lại cảm giác mướt nhẹ dịu dàng mát mẻ khi ve vuốt làn da, đồng thời phản quang nhẹ sang trọng huyền bí dưới nắng xiên, tôn lên vẻ thanh tao duyên dáng vượt thời gian.",
            img: "images/trang_phuc.png",
            alt: "Dệt lụa tơ tằm truyền thống"
        }
    };

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const selectedTab = btn.getAttribute('data-tab');
            const data = craftData[selectedTab];
            if (!data) return;

            // Xóa trạng thái active của tất cả các nút tab khác
            tabBtns.forEach(b => b.classList.remove('active'));
            // Kích hoạt nút tab hiện tại
            btn.classList.add('active');

            // Tạo hiệu ứng Fade Out bảng hiện tại để chuẩn bị tải dữ liệu mới
            showcasePanel.classList.add('fade-out');

            // Đợi 250ms hiệu ứng mờ dần hoàn tất rồi cập nhật nội dung
            setTimeout(() => {
                craftTitle.textContent = data.title;
                craftDesc1.textContent = data.desc1;
                craftQuote.textContent = data.quote;
                craftDesc2.textContent = data.desc2;
                craftImg.src = data.img;
                craftImg.alt = data.alt;

                // Gỡ bỏ fade-out để kích hoạt slide-up hiện nội dung mới lên lung linh
                showcasePanel.classList.remove('fade-out');
            }, 250);
        });
    });
}

/**
 * Tạo hiệu ứng nghiêng 3D chân thực khi rê chuột qua (3D Tilt Card)
 */
function init3DTiltCards() {
    const cards = document.querySelectorAll('.tilt-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left; // Tọa độ X của chuột trong thẻ
            const y = e.clientY - rect.top;  // Tọa độ Y của chuột trong thẻ
            
            const width = rect.width;
            const height = rect.height;
            
            // Tính toán góc xoay từ trung tâm thẻ (-8 đến 8 độ)
            const rotateX = ((height / 2 - y) / (height / 2)) * 8;
            const rotateY = ((x - width / 2) / (width / 2)) * 8;
            
            // Áp dụng biến đổi xoay 3D trực tiếp
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
        });

        // Đưa thẻ về trạng thái tĩnh ban đầu khi chuột rời đi
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        });
    });
}

/**
 * Vẽ đêm sao lấp lánh & bụi sáng nguyện ước bay lên tại Quote Banner Canvas
 */
function initQuoteCanvas() {
    const canvas = document.getElementById('quote-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const banner = canvas.closest('section');
    if (!banner) return;

    let stars = [];
    let wishes = [];
    const maxStars = 35;
    const maxWishes = 15;

    function resizeCanvas() {
        const rect = banner.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        ctx.scale(dpr, dpr);

        // Khởi tạo các ngôi sao nhấp nháy
        stars = [];
        for (let i = 0; i < maxStars; i++) {
            stars.push(new Star(rect.width, rect.height));
        }

        // Khởi tạo các hạt bụi nguyện ước bay từ dưới lên
        wishes = [];
        for (let i = 0; i < maxWishes; i++) {
            wishes.push(new WishParticle(rect.width, rect.height));
        }
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Vẽ Trăng khuyết rực sáng màu đồng nhẹ lãng mạn ở góc cao bên phải
    function drawMoon(ctx, w) {
        ctx.save();
        const moonX = w - 100;
        const moonY = 65;
        const radius = 22;

        // Vẽ Hào quang mặt trăng
        const glow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, radius * 3);
        glow.addColorStop(0, 'rgba(255, 235, 180, 0.22)');
        glow.addColorStop(1, 'rgba(255, 235, 180, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(moonX, moonY, radius * 3, 0, Math.PI * 2);
        ctx.fill();

        // Vẽ Mặt trăng sáng tròn trước rồi che đi tạo hình khuyết
        ctx.fillStyle = 'rgba(255, 240, 200, 0.88)';
        ctx.beginPath();
        ctx.arc(moonX, moonY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Tạo bóng che tạo dáng khuyết trăng mộng mơ
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(moonX - 8, moonY - 4, radius + 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // Vòng lặp vẽ đồ họa 60FPS
    function render() {
        const rect = banner.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);

        // Vẽ trăng khuyết lấp lánh
        drawMoon(ctx, rect.width);

        // Cập nhật và vẽ các ngôi sao
        for (let star of stars) {
            star.update();
            star.draw(ctx);
        }

        // Cập nhật và vẽ các đốm nguyện ước bay từ đáy banner lên trời
        for (let wish of wishes) {
            wish.update(rect.width, rect.height);
            wish.draw(ctx);
        }

        requestAnimationFrame(render);
    }
    render();
}

/**
 * Cuộn trang kể chuyện trượt hiển thị (Scroll Reveal)
 */
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal-on-scroll');
    if (reveals.length === 0) return;

    // Cấu hình Intersection Observer nhạy bén bắt kịp mọi nhịp cuộn trang
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-visible');
                // Ngừng theo dõi phần tử này sau khi đã hiển thị mượt mà để tiết kiệm bộ nhớ
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.01,
        rootMargin: '0px 0px -50px 0px'
    });

    reveals.forEach(el => observer.observe(el));
}

/**
 * Quản lý Slider câu chuyện di sản ở Hero Banner (Full-screen Atmospheric Fade & Parallax Slide)
 */
function initHeroSlider() {
    const textSlides = document.querySelectorAll('.hero-slide-text');
    const bgImgs = document.querySelectorAll('.hero-bg-img');
    const dots = document.querySelectorAll('.hero-dot');

    if (textSlides.length === 0) return;

    let currentSlide = 0;
    let isTransitioning = false;
    let autoPlayTimer = null;

    function showSlide(index) {
        if (isTransitioning || index === currentSlide) return;
        isTransitioning = true;

        const prevIndex = currentSlide;
        currentSlide = index;

        // Xác định hướng di chuyển (tiến hay lùi) để tạo chuyển động trượt ngang (Horizontal Parallax Slide) nịnh mắt
        const direction = index > prevIndex ? 'next' : 'prev';

        // 1. Chuyển đổi khối chữ (Horizontal Parallax Slide)
        textSlides.forEach((slide, idx) => {
            slide.classList.remove('active', 'translate-x-0', 'opacity-100', 'pointer-events-auto');
            slide.classList.remove('translate-x-12', '-translate-x-12');
            
            if (idx === prevIndex) {
                // Trượt slide cũ biến mất sang bên trái (nếu tiến) hoặc bên phải (nếu lùi)
                if (direction === 'next') {
                    slide.classList.add('-translate-x-12', 'opacity-0', 'pointer-events-none');
                } else {
                    slide.classList.add('translate-x-12', 'opacity-0', 'pointer-events-none');
                }
            } else {
                // Đặt các slide ẩn ở vị trí mặc định ẩn đi
                slide.classList.add('opacity-0', 'pointer-events-none');
            }
        });

        const activeText = textSlides[index];
        // Đặt vị trí xuất phát cho slide mới dựa theo hướng trượt
        activeText.classList.remove('translate-x-12', '-translate-x-12');
        if (direction === 'next') {
            activeText.classList.add('translate-x-12');
        } else {
            activeText.classList.add('-translate-x-12');
        }

        // Force reflow để trình duyệt cập nhật layout
        activeText.offsetHeight;

        // Trượt slide mới vào tâm và bừng sáng lên lung linh
        activeText.classList.remove('translate-x-12', '-translate-x-12');
        activeText.classList.add('active', 'translate-x-0', 'opacity-100', 'pointer-events-auto');

        // 2. Chuyển đổi ảnh nền tràn viền (Cinematic Fade Cross)
        bgImgs.forEach((img, idx) => {
            if (idx === index) {
                img.classList.remove('opacity-0');
                img.classList.add('active', 'opacity-100');
            } else {
                img.classList.remove('active', 'opacity-100');
                img.classList.add('opacity-0');
            }
        });

        // 3. Cập nhật các chấm tròn điều hướng phát sáng (Glowing Lotus Dots)
        dots.forEach((dotBtn, idx) => {
            const spanDot = dotBtn.querySelector('span:first-child');
            const spanText = dotBtn.querySelector('span:last-child');
            
            if (idx === index) {
                dotBtn.classList.add('active');
                spanDot.className = 'w-3 h-3 rounded-full bg-[#B22222] shadow-[0_0_8px_#B22222] transition-all duration-300 transform scale-110';
                spanText.className = 'font-serif text-[11px] tracking-wider text-white font-medium transition-opacity duration-300 opacity-100';
            } else {
                dotBtn.classList.remove('active');
                spanDot.className = 'w-2.5 h-2.5 rounded-full bg-white/50 hover:bg-[#B22222] hover:shadow-[0_0_6px_#B22222] transition-all duration-300';
                spanText.className = 'font-serif text-[11px] tracking-wider text-white/60 group-hover:text-white transition-opacity duration-300';
            }
        });

        // Đợi transition hoàn thành (700ms)
        setTimeout(() => {
            isTransitioning = false;
        }, 700);
    }

    // Gán click chuyển slide cho các dots
    dots.forEach((dot, idx) => {
        dot.addEventListener('click', () => {
            showSlide(idx);
            resetAutoPlay();
        });
    });

    // Tự động autoplay chuyển slide sau 3 giây (3000ms)
    function startAutoPlay() {
        autoPlayTimer = setInterval(() => {
            let index = (currentSlide + 1) % textSlides.length;
            showSlide(index);
        }, 3000);
    }

    function resetAutoPlay() {
        clearInterval(autoPlayTimer);
        startAutoPlay();
    }

    startAutoPlay();
}


