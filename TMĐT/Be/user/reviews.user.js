/**
 * user/reviews.user.js
 * API đánh giá sản phẩm cho người dùng
 *
 * Routes:
 *   POST /api/reviews                    - Thêm đánh giá (cần đăng nhập)
 *   GET  /api/products/:id/reviews       - Xem đánh giá theo sản phẩm (public)
 *
 * Ví dụ POST /api/reviews:
 * {
 *   "maSanPham": 1,
 *   "soSao": 5,
 *   "binhLuan": "Sản phẩm rất đẹp!"
 * }
 *
 * Điều kiện đánh giá:
 *   - User phải đã mua và nhận sản phẩm (đơn hàng "Đã giao")
 *   - Mỗi user chỉ đánh giá 1 lần / sản phẩm
 */

const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');
const { authMiddleware } = require('../middleware/authMiddleware');

// ─────────────────────────────────────────────
// POST /api/reviews — Thêm đánh giá (cần đăng nhập)
// ─────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
    const { maSanPham, soSao, binhLuan } = req.body;

    if (!maSanPham || !soSao) {
        return res.status(400).json({
            success: false,
            message: 'Thiếu thông tin: maSanPham, soSao'
        });
    }
    if (soSao < 1 || soSao > 5) {
        return res.status(400).json({
            success: false,
            message: 'soSao phải từ 1 đến 5.'
        });
    }

    try {
        // Kiểm tra user đã mua và nhận sản phẩm này chưa
        const purchaseReq = new sql.Request();
        purchaseReq.input('maNguoiDung', sql.Int,          req.user.id);
        purchaseReq.input('maSanPham',   sql.NVarChar(10), maSanPham);
        const purchased = await purchaseReq.query(`
            SELECT TOP 1 dh.maDonHang
            FROM DonHang dh
            INNER JOIN ChiTietDonHang ctdh ON dh.maDonHang = ctdh.maDonHang
            INNER JOIN TrangThai tt ON dh.maTrangThai = tt.maTrangThai
            WHERE dh.maNguoiDung = @maNguoiDung
              AND ctdh.maSanPham = @maSanPham
              AND tt.tenTrangThai = N'Đã giao'
        `);

        if (purchased.recordset.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Bạn chỉ có thể đánh giá sản phẩm đã mua và đã nhận hàng.'
            });
        }

        // Kiểm tra đã đánh giá chưa
        const existReq = new sql.Request();
        existReq.input('maNguoiDung', sql.Int,          req.user.id);
        existReq.input('maSanPham',   sql.NVarChar(10), maSanPham);
        const existing = await existReq.query(`
            SELECT maDanhGia FROM DanhGia
            WHERE maNguoiDung = @maNguoiDung AND maSanPham = @maSanPham
        `);

        if (existing.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Bạn đã đánh giá sản phẩm này rồi.'
            });
        }

        // Thêm đánh giá
        const insertReq = new sql.Request();
        insertReq.input('maNguoiDung', sql.Int,          req.user.id);
        insertReq.input('maSanPham',   sql.NVarChar(10), maSanPham);
        insertReq.input('soSao',       sql.Int,     soSao);
        insertReq.input('binhLuan',    sql.NVarChar, binhLuan || null);

        const result = await insertReq.query(`
            INSERT INTO DanhGia (maNguoiDung, maSanPham, soSao, binhLuan)
            OUTPUT INSERTED.maDanhGia, INSERTED.ngayDanhGia
            VALUES (@maNguoiDung, @maSanPham, @soSao, @binhLuan)
        `);

        return res.status(201).json({
            success: true,
            message: 'Đánh giá của bạn đã được ghi nhận. Cảm ơn!',
            data: result.recordset[0]
        });
    } catch (err) {
        console.error('POST /reviews error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────────
// GET /api/products/:id/reviews — Xem đánh giá (public)
// Query: page, limit
// ─────────────────────────────────────────────
router.get('/products/:id/reviews', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const request = new sql.Request();
        request.input('maSanPham', sql.NVarChar(10), req.params.id);
        request.input('offset',    sql.Int, offset);
        request.input('limit',     sql.Int, parseInt(limit));

        // Thống kê tổng quan
        const statsResult = await request.query(`
            SELECT
                COUNT(*)                              AS tongSoDanhGia,
                ISNULL(AVG(CAST(soSao AS FLOAT)), 0)  AS diemTrungBinh,
                SUM(CASE WHEN soSao = 5 THEN 1 ELSE 0 END) AS sao5,
                SUM(CASE WHEN soSao = 4 THEN 1 ELSE 0 END) AS sao4,
                SUM(CASE WHEN soSao = 3 THEN 1 ELSE 0 END) AS sao3,
                SUM(CASE WHEN soSao = 2 THEN 1 ELSE 0 END) AS sao2,
                SUM(CASE WHEN soSao = 1 THEN 1 ELSE 0 END) AS sao1
            FROM DanhGia
            WHERE maSanPham = @maSanPham
        `);

        // Danh sách đánh giá kèm phản hồi admin
        const reviewResult = await request.query(`
            SELECT
                dg.maDanhGia,
                nd.ten AS tenNguoiDung,
                dg.soSao,
                dg.binhLuan,
                dg.ngayDanhGia,
                ph.tieuDe   AS tieuDePhanHoi,
                ph.noiDung  AS noiDungPhanHoi,
                ph.ngayTao  AS ngayPhanHoi
            FROM DanhGia dg
            LEFT JOIN NguoiDung nd ON dg.maNguoiDung = nd.maNguoiDung
            LEFT JOIN PhanHoiDanhGia ph
                ON dg.maDanhGia = ph.maDanhGia AND ph.trangThai = N'Hiển thị'
            WHERE dg.maSanPham = @maSanPham
            ORDER BY dg.ngayDanhGia DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);

        const stats = statsResult.recordset[0];

        return res.json({
            success: true,
            data: {
                thongKe: {
                    tongSoDanhGia: stats.tongSoDanhGia,
                    diemTrungBinh: parseFloat(stats.diemTrungBinh).toFixed(1),
                    phanBoSao: {
                        5: stats.sao5,
                        4: stats.sao4,
                        3: stats.sao3,
                        2: stats.sao2,
                        1: stats.sao1
                    }
                },
                danhGia: reviewResult.recordset
            },
            pagination: {
                total:      stats.tongSoDanhGia,
                page:       parseInt(page),
                limit:      parseInt(limit),
                totalPages: Math.ceil(stats.tongSoDanhGia / parseInt(limit))
            }
        });
    } catch (err) {
        console.error('GET /products/:id/reviews error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
