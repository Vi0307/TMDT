/**
 * user/posts.js
 * API bài viết giới thiệu (public, không cần đăng nhập)
 *
 * Vì DB hiện tại không có bảng BaiViet, module này dùng dữ liệu tĩnh (mock).
 * Khi cần lưu DB thật, tạo bảng BaiViet và thay thế phần mock bên dưới.
 *
 * Routes:
 *   GET /api/posts       - Danh sách bài viết
 *   GET /api/posts/:id   - Chi tiết bài viết
 */

const express = require('express');
const router = express.Router();

// ── Dữ liệu mock (thay bằng DB query khi có bảng BaiViet) ──
const POSTS = [
    {
        id: 1,
        tieuDe: 'Giới thiệu về Hội An',
        tomTat: 'Hội An – phố cổ nghìn năm tuổi, di sản văn hóa thế giới được UNESCO công nhận.',
        noiDung: `Hội An là một thành phố thuộc tỉnh Quảng Nam, Việt Nam. 
Nơi đây nổi tiếng với khu phố cổ được bảo tồn gần như nguyên vẹn, 
phản ánh sự giao thoa văn hóa Việt – Hoa – Nhật qua nhiều thế kỷ.
Hội An được UNESCO công nhận là Di sản Văn hóa Thế giới năm 1999.`,
        hinhAnh: '/images/hoian-intro.jpg',
        ngayDang: '2024-01-01',
        tacGia: 'Admin'
    },
    {
        id: 2,
        tieuDe: 'Đặc sản Hội An không thể bỏ qua',
        tomTat: 'Cao lầu, mì Quảng, bánh mì Phượng – những món ăn làm nên thương hiệu ẩm thực Hội An.',
        noiDung: `Ẩm thực Hội An mang đậm bản sắc miền Trung với những món ăn độc đáo:
- Cao lầu: sợi mì đặc biệt chỉ có ở Hội An, ăn kèm thịt heo và rau sống.
- Mì Quảng: sợi mì vàng, nước dùng đậm đà, topping phong phú.
- Bánh mì Phượng: được CNN bình chọn là bánh mì ngon nhất thế giới.
- Hoành thánh: vỏ mỏng, nhân thịt tôm thơm ngon.`,
        hinhAnh: '/images/dacsan-hoian.jpg',
        ngayDang: '2024-01-15',
        tacGia: 'Admin'
    },
    {
        id: 3,
        tieuDe: 'Thủ công mỹ nghệ Hội An',
        tomTat: 'Làng nghề truyền thống – nơi lưu giữ tinh hoa văn hóa qua từng sản phẩm thủ công.',
        noiDung: `Hội An nổi tiếng với nhiều làng nghề truyền thống:
- Làng mộc Kim Bồng: chạm khắc gỗ tinh xảo, đóng thuyền truyền thống.
- Làng gốm Thanh Hà: gốm đất nung thủ công, lưu giữ kỹ thuật 500 năm.
- Làng rau Trà Quế: rau sạch hữu cơ, trải nghiệm làm nông dân.
- Nghề may áo dài: hàng trăm tiệm may thủ công với chất lượng cao.`,
        hinhAnh: '/images/thucong-hoian.jpg',
        ngayDang: '2024-02-01',
        tacGia: 'Admin'
    },
    {
        id: 4,
        tieuDe: 'Hướng dẫn mua sắm tại Hội An',
        tomTat: 'Mua gì, ở đâu và bao nhiêu tiền – cẩm nang mua sắm đầy đủ cho du khách.',
        noiDung: `Khi đến Hội An, bạn không thể bỏ qua:
1. Chợ Hội An: mua đặc sản, quà lưu niệm với giá hợp lý.
2. Phố cổ: các cửa hàng thủ công mỹ nghệ, đèn lồng, tranh nghệ thuật.
3. Chợ đêm: hoạt động từ 18h, nhiều mặt hàng thủ công giá tốt.

Lưu ý: nên mặc cả khi mua ở chợ, giá niêm yết tại cửa hàng thường cố định.`,
        hinhAnh: '/images/muasam-hoian.jpg',
        ngayDang: '2024-02-15',
        tacGia: 'Admin'
    }
];

// ─────────────────────────────────────────────
// GET /api/posts
// Response: { success, data: [...posts] }
// ─────────────────────────────────────────────
router.get('/', (req, res) => {
    // Trả về danh sách không kèm noiDung đầy đủ (chỉ tomTat)
    const list = POSTS.map(({ noiDung, ...rest }) => rest);
    return res.json({ success: true, data: list });
});

// ─────────────────────────────────────────────
// GET /api/posts/:id
// Response: { success, data: { ...post } }
// ─────────────────────────────────────────────
router.get('/:id', (req, res) => {
    const post = POSTS.find(p => p.id === parseInt(req.params.id));
    if (!post) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });
    }
    return res.json({ success: true, data: post });
});

module.exports = router;
