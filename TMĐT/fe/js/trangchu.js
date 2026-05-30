/**
 * trangchu.js
 * Xử lý tải dữ liệu sản phẩm và danh mục từ API cho trang chủ
 * Bản nâng cấp mỹ thuật Hội An Tinh Hoa đỉnh cao (60FPS Canvas, Water Reflections, Golden Trails & Moon)
 */

const API_URL = 'http://localhost:3005/api';

/* ==========================================================================
   HẠT HỘI AN & CƠ CHẾ CHUYỂN ĐỘNG HÌNH ẢNH (GRAPHICS ENGINES & CLASSES)
   ========================================================================== */

/**
 * A. Vệt sáng bụi vàng kim bám theo chuột (Interactive Golden Cursor Trail Particle)
 */
class CursorParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 2.8 + 0.8;
        this.speedX = (Math.random() - 0.5) * 1.5;
        this.speedY = (Math.random() - 0.5) * 1.5 - 0.4; // Bay nhẹ lên trên
        this.opacity = 1.0;
        this.fadeSpeed = Math.random() * 0.025 + 0.015;
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

        if (this.size > 2) {
            const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3.0);
            glow.addColorStop(0, `rgba(255, 186, 71, ${this.opacity * 0.25})`);
            glow.addColorStop(1, 'rgba(255, 186, 71, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 3.0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

/**
 * B. Đốm đom đóm / bụi lửa bay lên lơ lửng ở Hero (Hero Glowing Sparks)
 */
class HeroSpark {
    constructor(w, h) {
        this.reset(w, h);
        this.y = Math.random() * h;
    }

    reset(w, h) {
        this.x = Math.random() * w;
        this.y = h + Math.random() * 40;
        this.size = Math.random() * 2.5 + 0.8;
        this.speedY = Math.random() * 0.5 + 0.2;
        this.angle = Math.random() * Math.PI * 2;
        this.swaySpeed = Math.random() * 0.015 + 0.005;
        this.swayWidth = Math.random() * 0.35 + 0.12;
        this.opacity = Math.random() * 0.65 + 0.15;
    }

    update(w, h) {
        this.y -= this.speedY;
        this.angle += this.swaySpeed;
        this.x += Math.sin(this.angle) * this.swayWidth;

        if (this.y < h * 0.45) {
            this.opacity -= 0.004;
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

        if (this.size > 1.8) {
            const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3.5);
            glow.addColorStop(0, `rgba(255, 186, 71, ${this.opacity * 0.3})`);
            glow.addColorStop(1, 'rgba(255, 186, 71, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 3.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

/**
 * C. Sao nhấp nháy trên bầu trời Sông Hoài (Twinkling Star)
 */
class Star {
    constructor(w, h) {
        this.x = Math.random() * w;
        this.y = Math.random() * 110; // Chỉ ở bầu trời đỉnh sông
        this.maxOpacity = Math.random() * 0.7 + 0.1;
        this.opacity = Math.random() * this.maxOpacity;
        this.speed = Math.random() * 0.015 + 0.005;
        this.sign = Math.random() < 0.5 ? 1 : -1;
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
        ctx.fillStyle = `rgba(255, 255, 230, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.random() * 0.6 + 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * D. Vân sóng lấp lánh phản quang mặt nước sông (River Ripple)
 */
class RiverRipple {
    constructor(w, h) {
        this.reset(w, h);
        this.x = Math.random() * w;
    }

    reset(w, h) {
        this.y = Math.random() * (h - 130) + 90;
        this.length = Math.random() * 90 + 35;
        this.speed = Math.random() * 0.22 + 0.06;
        this.opacity = 0;
        this.maxOpacity = Math.random() * 0.12 + 0.02;
        this.fadeSpeed = 0.0035;
        this.state = 'fadein';
    }

    update(w, h) {
        this.x -= this.speed;

        if (this.state === 'fadein') {
            this.opacity += this.fadeSpeed;
            if (this.opacity >= this.maxOpacity) {
                this.opacity = this.maxOpacity;
                this.state = 'active';
            }
        } else if (this.state === 'active') {
            if (Math.random() < 0.01) this.state = 'fadeout';
        } else if (this.state === 'fadeout') {
            this.opacity -= this.fadeSpeed;
            if (this.opacity <= 0) {
                this.opacity = 0;
                this.reset(w, h);
                this.x = w + this.length;
            }
        }

        if (this.x + this.length < 0) {
            this.reset(w, h);
            this.x = w;
        }
    }

    draw(ctx) {
        const grad = ctx.createLinearGradient(this.x, this.y, this.x + this.length, this.y);
        grad.addColorStop(0, 'rgba(255, 186, 71, 0)');
        grad.addColorStop(0.5, `rgba(255, 186, 71, ${this.opacity})`);
        grad.addColorStop(1, 'rgba(255, 186, 71, 0)');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.length, this.y);
        ctx.stroke();
    }
}

/**
 * E. Đốm đốm bụi nguyện ước bay từ hoa đăng lên (Lantern Spark Trail)
 */
class LanternSpark {
    constructor(x, y) {
        this.x = x + (Math.random() - 0.5) * 12;
        this.y = y - 5;
        this.size = Math.random() * 1.8 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = -(Math.random() * 0.5 + 0.3); // Bay ngược lên trời
        this.opacity = 1.0;
        this.fade = Math.random() * 0.015 + 0.008;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.opacity -= this.fade;
    }

    draw(ctx) {
        if (this.opacity <= 0) return;
        ctx.fillStyle = `rgba(255, 160, 30, ${this.opacity * 0.85})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}


/* ==========================================================================
   KHỞI TẠO VÀ ĐIỀU HƯỚNG TẢI TRANG CHỦ (DOMContentLoaded ORCHESTRATION)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. CHẠY TẢI API TRƯỚC TIÊN (ƯU TIÊN TUYỆT ĐỐI NỘI DUNG hiển thị trang web)
    const apiLoading = Promise.all([
        loadCategories(),
        loadNewProducts()
    ]).catch(err => console.error("Lỗi đồng bộ dữ liệu trang chủ:", err));

    // 2. KHỞI TẠO CÁC HIỆU ỨNG THỊ GIÁC (Cô lập trong try-catch, lỗi không cản trở API)
    try {
        initHeroCanvas();
    } catch (e) {
        console.error("Lỗi khởi tạo Hero Canvas:", e);
    }

    try {
        initRiverCanvas();
    } catch (e) {
        console.error("Lỗi khởi tạo Sông Hoài Canvas:", e);
    }

    try {
        initWishModal();
    } catch (e) {
        console.error("Lỗi cấu hình Modal điều ước:", e);
    }

    try {
        initScrollReveal();
    } catch (e) {
        console.error("Lỗi cấu hình Scroll-Reveal:", e);
    }

    await apiLoading;
});


/* ==========================================================================
   TẢI DỮ LIỆU TỪ API BACKEND (API FETCH LOGIC)
   ========================================================================== */

async function loadCategories() {
    const container = document.getElementById('category-container');
    if (!container) return;

    // Bản đồ ảnh danh mục cục bộ (local high-quality assets)
    const localCategoryImages = {
        1: 'images/thu_cong_my_nghe.png',
        2: 'images/dac_san.png',
        3: 'images/qua_luu_niem.png',
        4: 'images/trang_phuc.png'
    };

    try {
        const res = await fetch(`${API_URL}/categories`);
        const json = await res.json();

        if (json.success) {
            const categories = json.data;
            // Chỉ lấy 4 danh mục tiêu biểu để render vào bento grid
            container.innerHTML = categories.slice(0, 4).map((cat, index) => {
                let colSpan = index === 0 ? 'md:col-span-2 md:row-span-2' : (index === 1 ? 'md:col-span-2' : '');
                let imgSrc = localCategoryImages[cat.maDanhMuc] || (cat.hinhAnh ? `images/${cat.hinhAnh}` : 'https://placehold.co/600x400?text=' + encodeURIComponent(cat.tenDanhMuc));
                
                return `
                    <div class="${colSpan} relative group overflow-hidden rounded-lg cursor-pointer" onclick="window.location.href='sanpham.html?category=${cat.maDanhMuc}'">
                        <img class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                             src="${imgSrc}" 
                             alt="${cat.tenDanhMuc}"
                             onerror="this.src='https://placehold.co/600x400?text=${encodeURIComponent(cat.tenDanhMuc)}'">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-8">
                            <h3 class="font-title-sm text-title-sm text-white mb-2">${cat.tenDanhMuc}</h3>
                            <p class="text-white/80 text-sm font-body-md opacity-0 group-hover:opacity-100 transition-opacity">Khám phá bộ sưu tập di sản.</p>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (err) {
        console.error('Lỗi tải danh mục:', err);
    }
}

async function loadNewProducts() {
    const container = document.getElementById('product-container');
    if (!container) return;

    try {
        const res = await fetch(`${API_URL}/products?limit=4`);
        const json = await res.json();

        if (json.success) {
            const products = json.data;
            container.innerHTML = products.map(sp => {
                const giaFmt = Number(sp.gia).toLocaleString('vi-VN') + ' VNĐ';
                const imgSrc = sp.hinhAnh ? (sp.hinhAnh.startsWith('http://') || sp.hinhAnh.startsWith('https://') || sp.hinhAnh.startsWith('data:') ? sp.hinhAnh : `images/${sp.hinhAnh}`) : 'https://placehold.co/400x500?text=' + encodeURIComponent(sp.tenSanPham);
                
                return `
                    <div class="bg-surface p-base rounded-lg shadow-sm hover:shadow-md transition-shadow group cursor-pointer" 
                          onclick="window.location.href='chitietsanpham.html?id=${sp.maSanPham}'">
                        <div class="relative overflow-hidden aspect-[4/5] mb-stack-sm rounded">
                            <img class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                  src="${imgSrc}" 
                                  alt="${sp.tenSanPham}"
                                  onerror="this.src='https://placehold.co/400x500?text=${encodeURIComponent(sp.tenSanPham)}'">
                            ${sp.soLuongTon < 10 ? '<span class="absolute top-4 left-4 bg-secondary text-white px-2 py-1 text-[10px] font-bold rounded">SẮP HẾT</span>' : ''}
                        </div>
                        <div class="p-stack-sm text-center">
                            <h4 class="font-title-sm text-[18px] text-on-surface mb-1 truncate">${sp.tenSanPham}</h4>
                            <p class="font-body-md text-secondary font-semibold">${giaFmt}</p>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (err) {
        console.error('Lỗi tải sản phẩm mới:', err);
        container.innerHTML = '<p class="col-span-full text-center py-10 text-outline">Không thể tải sản phẩm. Vui lòng thử lại sau.</p>';
    }
}


/* ==========================================================================
   CHI TIẾT CÀI ĐẶT ĐỒ HỌA (DETAILED CANVAS RUNTIMES)
   ========================================================================== */

/**
 * 1. HIỆU ỨNG ĐỐM LỬA BAY LƠ LỬNG PHẦN HERO & VỆT SÁNG CHUỘT
 */
function initHeroCanvas() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let sparks = [];
    let trail = [];

    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const count = Math.min(35, Math.floor(rect.width / 40));
        sparks = [];
        for (let i = 0; i < count; i++) {
            sparks.push(new HeroSpark(canvas.width, canvas.height));
        }
    }

    window.addEventListener('resize', resize);
    resize();

    // Rê chuột bám vệt sáng trong Hero
    canvas.parentElement.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        // Chỉ kích hoạt khi di chuột trong lòng Hero
        if (mx >= 0 && mx <= canvas.width && my >= 0 && my <= canvas.height) {
            for (let i = 0; i < 2; i++) {
                trail.push(new CursorParticle(mx, my));
            }
        }
        if (trail.length > 50) trail.shift();
    });

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Vẽ đom đóm
        sparks.forEach(spark => {
            spark.update(canvas.width, canvas.height);
            spark.draw(ctx);
        });

        // Vẽ vệt sáng chuột
        trail.forEach((p, idx) => {
            p.update();
            p.draw(ctx);
            if (p.opacity <= 0) {
                trail.splice(idx, 1);
            }
        });

        requestAnimationFrame(animate);
    }
    animate();
}

/**
 * 2. VẼ HOA ĐĂNG HÌNH HOA SEN (LOTUS DRAWER FUNCTION)
 */
function drawLotusLantern(ctx, x, y, size, color, glow, flameHeight) {
    // 1. Vẽ bóng hào quang phát sáng dưới nước của hoa đăng
    const glowGrad = ctx.createRadialGradient(x, y, 2, x, y, size * 2.5 * glow);
    glowGrad.addColorStop(0, `rgba(255, 155, 30, ${0.4 * glow})`);
    glowGrad.addColorStop(0.4, `rgba(181, 36, 36, ${0.15 * glow})`);
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(x, y, size * 2.5 * glow, 0, Math.PI * 2);
    ctx.fill();

    // 2. Vẽ 3 tầng cánh hoa sen chồng lợp sắc màu
    const layers = [
        { petals: 7, scale: 1.0, color: color.outer },
        { petals: 6, scale: 0.8, color: color.middle },
        { petals: 5, scale: 0.58, color: color.inner }
    ];

    layers.forEach((layer) => {
        ctx.fillStyle = layer.color;
        const petalCount = layer.petals;
        const petalSize = size * layer.scale;

        for (let i = 0; i < petalCount; i++) {
            const angle = (i * Math.PI * 2) / petalCount;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(-petalSize * 0.42, -petalSize * 0.5, 0, -petalSize);
            ctx.quadraticCurveTo(petalSize * 0.42, -petalSize * 0.5, 0, 0);
            ctx.closePath();
            ctx.fill();

            // Nhụy chỉ vàng lấp lánh giữa cánh sen
            ctx.strokeStyle = 'rgba(255, 186, 71, 0.4)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -petalSize * 0.85);
            ctx.stroke();

            ctx.restore();
        }
    });

    // 3. Đế sáp hoa đăng
    ctx.fillStyle = '#261406';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.28, 0, Math.PI * 2);
    ctx.fill();

    // 4. Lõi nến & quầng lửa bập bùng
    const flameY = y - size * 0.12;
    const flameSize = size * 0.35;

    // Phản xạ ánh lửa ấm áp
    const flameGlow = ctx.createRadialGradient(x, flameY, 1, x, flameY, flameSize * 2.2);
    flameGlow.addColorStop(0, 'rgba(255, 255, 225, 1)');
    flameGlow.addColorStop(0.3, 'rgba(255, 180, 50, 0.85)');
    flameGlow.addColorStop(1, 'rgba(181, 36, 36, 0)');
    ctx.fillStyle = flameGlow;
    ctx.beginPath();
    ctx.arc(x, flameY, flameSize * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Ngọn lửa nhỏ xinh đung đưa
    ctx.fillStyle = '#fffae6';
    ctx.beginPath();
    ctx.moveTo(x, flameY);
    ctx.quadraticCurveTo(x - flameSize * 0.4, flameY, x, flameY - flameSize * flameHeight);
    ctx.quadraticCurveTo(x + flameSize * 0.4, flameY, x, flameY);
    ctx.closePath();
    ctx.fill();
}

/**
 * 3. HỆ THỐNG PHÁT TRIỂN DÒNG SÔNG SÔNG HOÀI TƯƠNG TÁC (River Runtime System)
 */
function initRiverCanvas() {
    const canvas = document.getElementById('river-canvas');
    if (!canvas) return;
    const container = canvas.parentElement;
    let ctx;
    let width, height;
    let lanterns = [];
    let ripples = [];
    let stars = [];
    let sparkParticles = [];
    let cursorTrail = [];
    let hoveredLantern = null;

    const tooltip = document.getElementById('wish-tooltip');
    const tooltipAuthor = document.getElementById('tooltip-author');
    const tooltipText = document.getElementById('tooltip-text');

    const palettes = [
        { outer: '#b52424', middle: '#ff5a52', inner: '#ffba47' }, // Đỏ cổ truyền
        { outer: '#805600', middle: '#e5a022', inner: '#ffddb0' }, // Vàng Hoài Cổ
        { outer: '#795553', middle: '#cfa3a0', inner: '#ffdad7' }, // Hồng Nhạt
        { outer: '#b52424', middle: '#eabcb8', inner: '#ffffff' }  // Trắng Đỏ kết hợp
    ];

    const defaultWishes = [
        { name: 'Khánh An', wish: 'Cầu mong bố mẹ luôn khỏe mạnh, gia quyến bình an.' },
        { name: 'Lê Hoài', wish: 'Chúc công việc kinh doanh phát tài, năm mới vạn sự cát tường.' },
        { name: 'Minh Thư', wish: 'Cầu chúc gia đình hạnh phúc viên mãn, ngập tràn tiếng cười.' },
        { name: 'Thanh Vân', wish: 'Mong cho cả nhà an lành, mọi chuyện học hành đỗ đạt.' },
        { name: 'Quốc Tuấn', wish: 'Ước mong một đời bình an, không sóng gió.' },
        { name: 'Ngọc Mai', wish: 'Cầu mong vạn sự như ý, công việc hanh thông.' }
    ];

    class LotusLantern {
        constructor(isInitial = false) {
            this.size = Math.random() * 8 + 14; // 14px to 22px
            this.palette = palettes[Math.floor(Math.random() * palettes.length)];
            
            const randomWish = defaultWishes[Math.floor(Math.random() * defaultWishes.length)];
            this.name = randomWish.name;
            this.wish = randomWish.wish;

            this.reset(isInitial);
        }

        reset(isInitial = false) {
            this.speedX = Math.random() * 0.22 + 0.12; // Trôi lững lờ
            this.bobSpeed = Math.random() * 0.015 + 0.007; // Nhấp nhô nhịp nhàng
            this.bobHeight = Math.random() * 4.5 + 2.5; // Chiều cao sóng
            this.angle = Math.random() * Math.PI * 2;

            if (isInitial) {
                this.x = Math.random() * width;
            } else {
                this.x = width + this.size * 2 + Math.random() * 120;
            }

            // Đèn lồng trôi ở dải sông giữa
            this.y = Math.random() * (height - 180) + 90;

            this.flameHeight = 1.0;
            this.glow = 1.0;
            this.targetGlow = 1.0;
        }

        update() {
            this.x -= this.speedX;
            this.angle += this.bobSpeed;
            this.flameHeight = 1.0 + (Math.random() - 0.5) * 0.18; // flicker nến

            // Mượt mà tăng sáng khi di chuột
            this.glow += (this.targetGlow - this.glow) * 0.12;

            // Lâu lâu thả một đốm nguyện ước bay lên trời
            if (Math.random() < 0.015) {
                const bobbingY = this.y + Math.sin(this.angle) * this.bobHeight;
                sparkParticles.push(new LanternSpark(this.x, bobbingY));
            }

            if (this.x < -this.size * 3) {
                this.reset(false);
            }
        }

        draw() {
            const bobbingY = this.y + Math.sin(this.angle) * this.bobHeight;
            
            // A. VẼ BÓNG NƯỚC PHẢN CHIẾU CÁNH SEN GIAO THAO (Dynamic Water Reflection)
            const reflGrad = ctx.createLinearGradient(this.x, bobbingY + this.size * 0.6, this.x, bobbingY + this.size * 0.6 + 95);
            const isRed = this.palette.outer === '#b52424';
            const baseColor = isRed ? '255, 90, 82' : '229, 160, 34';
            const deepColor = isRed ? '181, 36, 36' : '128, 86, 0';
            
            reflGrad.addColorStop(0, `rgba(${baseColor}, ${0.5 * this.glow})`);
            reflGrad.addColorStop(0.4, `rgba(${deepColor}, ${0.2 * this.glow})`);
            reflGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = reflGrad;
            ctx.beginPath();
            // Vẽ bóng nước dao động xê dịch theo trục ngang giống sóng nước cuốn trôi
            const waterWobble = Math.sin(this.angle * 1.6) * 4.5;
            ctx.moveTo(this.x - this.size * 0.8, bobbingY + this.size * 0.55);
            ctx.quadraticCurveTo(this.x + waterWobble, bobbingY + this.size * 1.8, this.x + waterWobble, bobbingY + this.size * 0.6 + 95);
            ctx.quadraticCurveTo(this.x - waterWobble, bobbingY + this.size * 1.8, this.x + this.size * 0.8, bobbingY + this.size * 0.55);
            ctx.closePath();
            ctx.fill();

            // B. VẼ HOA ĐĂNG CHÍNH
            drawLotusLantern(ctx, this.x, bobbingY, this.size, this.palette, this.glow, this.flameHeight);
        }

        isHovered(mx, my) {
            const bobbingY = this.y + Math.sin(this.angle) * this.bobHeight;
            const dist = Math.hypot(mx - this.x, my - bobbingY);
            return dist < this.size * 1.6;
        }
    }

    function resize() {
        const rect = container.getBoundingClientRect();
        width = rect.width;
        height = rect.height;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // Khởi tạo các vì sao lấp lánh trên đỉnh trời sông
        stars = [];
        const starCount = Math.min(30, Math.floor(width / 35));
        for (let i = 0; i < starCount; i++) {
            stars.push(new Star(width, height));
        }

        // Đèn hoa đăng trôi sông
        if (lanterns.length === 0) {
            const count = Math.min(15, Math.floor(width / 80));
            for (let i = 0; i < count; i++) {
                lanterns.push(new LotusLantern(true));
            }
        }

        // Vân sóng mặt nước
        if (ripples.length === 0) {
            const count = Math.min(12, Math.floor(width / 80));
            for (let i = 0; i < count; i++) {
                ripples.push(new RiverRipple(width, height));
            }
        }
    }

    window.addEventListener('resize', resize);
    resize();

    // Sự kiện di chuyển chuột vẽ bụi sáng chuột và hover đèn
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Vẽ vệt sáng chuột đuôi kim sa
        for (let i = 0; i < 2; i++) {
            cursorTrail.push(new CursorParticle(mx, my));
        }
        if (cursorTrail.length > 60) cursorTrail.shift();

        let currentlyHovered = null;
        for (let i = lanterns.length - 1; i >= 0; i--) {
            if (lanterns[i].isHovered(mx, my)) {
                currentlyHovered = lanterns[i];
                break;
            }
        }

        if (currentlyHovered) {
            canvas.style.cursor = 'help';
            hoveredLantern = currentlyHovered;
            hoveredLantern.targetGlow = 1.7; // Tỏa sáng mạnh hơn

            lanterns.forEach(lat => {
                if (lat !== hoveredLantern) lat.targetGlow = 1.0;
            });

            // Gắn nội dung lên Tooltip chỉ vàng sang trọng
            tooltipAuthor.textContent = hoveredLantern.name;
            tooltipText.textContent = `"${hoveredLantern.wish}"`;

            // Định vị Tooltip chính xác, căn từ tâm đèn vươn lên
            const bobbingY = hoveredLantern.y + Math.sin(hoveredLantern.angle) * hoveredLantern.bobHeight;
            tooltip.style.left = hoveredLantern.x + 'px';
            tooltip.style.top = bobbingY + 'px';
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translate(-50%, -100%) translateY(-22px) scale(1) rotate(1.5deg)'; // Scale lò xo xoay nhẹ nghệ thuật
        } else {
            canvas.style.cursor = 'pointer';
            if (hoveredLantern) {
                hoveredLantern.targetGlow = 1.0;
                hoveredLantern = null;
            }
            tooltip.style.opacity = '0';
            tooltip.style.transform = 'translate(-50%, -100%) translateY(-5px) scale(0.9) rotate(0deg)';
        }
    });

    canvas.addEventListener('mouseleave', () => {
        if (hoveredLantern) {
            hoveredLantern.targetGlow = 1.0;
            hoveredLantern = null;
        }
        tooltip.style.opacity = '0';
        tooltip.style.transform = 'translate(-50%, -100%) translateY(-5px) scale(0.9) rotate(0deg)';
    });

    canvas.addEventListener('click', () => {
        if (!hoveredLantern) {
            document.getElementById('btn-open-wish').click();
        }
    });

    // VÒNG LẶP CHẠY CANVAS HOẠT HỌA CHÍNH (River Animation Loop)
    function animate() {
        // A. Tô nền sông đêm xanh dương sẫm huyền bí
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#040710');
        bgGrad.addColorStop(0.4, '#090e1c');
        bgGrad.addColorStop(1, '#03050c');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // B. Vẽ các vì sao lấp lánh
        stars.forEach(star => {
            star.update();
            star.draw(ctx);
        });

        // C. VẼ VẦNG TRĂNG TRÒN SOI BÓNG NƯỚC (Atmospheric Silver-Golden Moon & Moonlight Path)
        const moonX = width - 90;
        const moonY = 55;
        const moonRad = 20;

        // Vầng trăng phát sáng mờ
        const moonGlow = ctx.createRadialGradient(moonX, moonY, 2, moonX, moonY, moonRad * 3.5);
        moonGlow.addColorStop(0, 'rgba(255, 245, 205, 0.28)');
        moonGlow.addColorStop(0.4, 'rgba(255, 245, 205, 0.08)');
        moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonRad * 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Trăng vật lý
        ctx.fillStyle = '#fffbe8';
        ctx.shadowColor = 'rgba(255, 252, 235, 0.7)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonRad, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Tránh nhòe lan sang phần khác

        // Dải sáng ánh trăng soi dọc lòng sông (Moonlight pathway reflection)
        const pathGrad = ctx.createLinearGradient(moonX - 45, 90, moonX + 45, 90);
        pathGrad.addColorStop(0, 'rgba(255, 245, 205, 0)');
        pathGrad.addColorStop(0.5, 'rgba(255, 245, 205, 0.025)');
        pathGrad.addColorStop(1, 'rgba(255, 245, 205, 0)');
        ctx.fillStyle = pathGrad;
        ctx.fillRect(moonX - 45, 90, 90, height - 90);

        // D. Vẽ các dải sóng lấp lánh nước sông
        ripples.forEach(rip => {
            rip.update(width, height);
            rip.draw(ctx);
        });

        // E. Sắp xếp hoa đăng theo chiều sâu Y và vẽ
        lanterns.sort((a, b) => a.y - b.y);
        lanterns.forEach(lat => {
            lat.update();
            lat.draw();
        });

        // F. Vẽ bụi sáng cầu nguyện bay lên
        sparkParticles.forEach((sp, idx) => {
            sp.update();
            sp.draw(ctx);
            if (sp.opacity <= 0) sparkParticles.splice(idx, 1);
        });

        // G. Vẽ vệt sáng chuột đuôi sa
        cursorTrail.forEach((p, idx) => {
            p.update();
            p.draw(ctx);
            if (p.opacity <= 0) cursorTrail.splice(idx, 1);
        });

        requestAnimationFrame(animate);
    }
    animate();

    // Hàm gọi thả đèn từ form modal
    window.releaseCustomLantern = function(name, wishText) {
        const newLantern = new LotusLantern();
        newLantern.name = name;
        newLantern.wish = wishText;
        newLantern.size = Math.random() * 4 + 19; // Đèn tự thả to hơn nổi bật
        newLantern.palette = { outer: '#b52424', middle: '#ff5a52', inner: '#ffffff' }; // Sáng rực rỡ nhất
        newLantern.reset(false);

        newLantern.x = width - 10;
        newLantern.y = Math.random() * (height - 200) + 110;

        // Nổ bụi sáng chúc mừng bay từ điểm xuất hiện
        for (let i = 0; i < 8; i++) {
            sparkParticles.push(new LanternSpark(newLantern.x, newLantern.y));
        }

        lanterns.push(newLantern);
        if (lanterns.length > 45) lanterns.shift();
    };
}

/**
 * 4. HỆ THỐNG ĐIỀU KHIỂN MODAL ƯỚC NGUYỆN (Wish Modal Controller)
 */
function initWishModal() {
    const modal = document.getElementById('wish-modal');
    const openBtn = document.getElementById('btn-open-wish');
    const closeBtn = document.getElementById('btn-close-modal');
    const cancelBtn = document.getElementById('btn-cancel-wish');
    const form = document.getElementById('wish-form');
    const inputName = document.getElementById('wish-name');
    const inputContent = document.getElementById('wish-content');
    const suggestions = document.querySelectorAll('.suggestion-tag');

    if (!modal) return;

    function openModal() {
        modal.classList.remove('pointer-events-none');
        modal.classList.add('pointer-events-auto', 'active');
        inputName.focus();
    }

    function closeModal() {
        modal.classList.remove('pointer-events-auto', 'active');
        modal.classList.add('pointer-events-none');
        form.reset();
    }

    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    suggestions.forEach(tag => {
        tag.addEventListener('click', () => {
            const cleanText = tag.textContent.replace(/[^\p{L}\p{N}\s,."'-]/gu, '').trim();
            inputContent.value = cleanText;
        });
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = inputName.value.trim();
        const content = inputContent.value.trim();

        if (name && content && window.releaseCustomLantern) {
            window.releaseCustomLantern(name, content);

            // Toast báo thành công sang trọng
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-amber-500 text-stone-950 font-serif font-bold px-6 py-3 rounded-full shadow-2xl z-[100] transition-all duration-500 opacity-0 translate-y-4';
            toast.textContent = '✨ Hoa đăng nguyện ước của bạn đã được thả trôi sông!';
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.classList.remove('opacity-0', 'translate-y-4');
                toast.classList.add('opacity-100', 'translate-y-0');
            }, 80);

            setTimeout(() => {
                toast.classList.remove('opacity-100', 'translate-y-0');
                toast.classList.add('opacity-0', 'translate-y-4');
                setTimeout(() => toast.remove(), 500);
            }, 3200);

            closeModal();
        }
    });
}

/**
 * 5. HIỆU ỨNG CUỘN TRANG MƯỢT MÀ (Scroll-Reveal Observer)
 */
function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    if (revealElements.length === 0) return;

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        rootMargin: '0px 0px -10px 0px',
        threshold: 0.01
    });

    revealElements.forEach(el => observer.observe(el));
}
