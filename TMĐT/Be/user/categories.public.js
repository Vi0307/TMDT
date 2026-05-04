/**
 * user/categories.public.js
 * API danh mục công khai (không cần đăng nhập)
 *
 * Routes:
 *   GET /api/categories              - Danh sách tất cả danh mục
 *   GET /api/categories/:id/products - Sản phẩm theo danh mục
 *
 * Ví dụ:
 *   GET /api/categories
 *   GET /api/categories/1/products?page=1&limit=12
 */

const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');

// ─────────────────────────────────────────────
// GET /api/categories
// Response: { success, data: [{ maDanhMuc, tenDanhMuc, soLuongSanPham }] }
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const result = await new sql.Request().query(`
            SELECT
                dm.maDanhMuc,
                dm.tenDanhMuc,
                COUNT(sp.maSanPham) AS soLuongSanPham
            FROM DanhMuc dm
            LEFT JOIN SanPham sp
                ON dm.maDanhMuc = sp.maDanhMuc
                AND sp.trangThai = N'Đang bán'
            GROUP BY dm.maDanhMuc, dm.tenDanhMuc
            ORDER BY dm.maDanhMuc ASC
        `);

        return res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('GET /categories error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────────
// GET /api/categories/:id/products
// Query: page, limit
// Response: { success, data, pagination }
// ─────────────────────────────────────────────
router.get('/:id/products', async (req, res) => {
    try {
        const { page = 1, limit = 12 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const request = new sql.Request();
        request.input('id',     sql.Int, req.params.id);
        request.input('offset', sql.Int, offset);
        request.input('limit',  sql.Int, parseInt(limit));

        // Kiểm tra danh mục tồn tại
        const catCheck = await request.query(
            'SELECT maDanhMuc, tenDanhMuc FROM DanhMuc WHERE maDanhMuc = @id'
        );
        if (catCheck.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy danh mục.'
            });
        }

        // Đếm tổng sản phẩm trong danh mục
        const countResult = await request.query(`
            SELECT COUNT(*) AS total
            FROM SanPham
            WHERE maDanhMuc = @id AND trangThai = N'Đang bán'
        `);
        const total = countResult.recordset[0].total;

        // Lấy sản phẩm
        const result = await request.query(`
            SELECT
                sp.maSanPham,
                sp.tenSanPham,
                sp.gia,
                sp.moTa,
                sp.hinhAnh,
                ISNULL(ct.soLuongTon, 0) AS soLuongTon,
                ISNULL(AVG(CAST(dg.soSao AS FLOAT)), 0) AS diemTrungBinh,
                COUNT(DISTINCT dg.maDanhGia) AS soLuongDanhGia
            FROM SanPham sp
            LEFT JOIN ChiTietSanPham ct ON sp.maSanPham = ct.maSanPham
            LEFT JOIN DanhGia dg ON sp.maSanPham = dg.maSanPham
            WHERE sp.maDanhMuc = @id AND sp.trangThai = N'Đang bán'
            GROUP BY sp.maSanPham, sp.tenSanPham, sp.gia, sp.moTa, sp.hinhAnh, ct.soLuongTon
            ORDER BY sp.maSanPham DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);

        return res.json({
            success: true,
            category: catCheck.recordset[0],
            data: result.recordset,
            pagination: {
                total,
                page:       parseInt(page),
                limit:      parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error('GET /categories/:id/products error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
