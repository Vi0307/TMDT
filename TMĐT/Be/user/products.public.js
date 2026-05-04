/**
 * user/products.public.js
 * API sản phẩm công khai (không cần đăng nhập)
 *
 * Routes:
 *   GET /api/products                          - Danh sách sản phẩm (có filter/search)
 *   GET /api/products/:id                      - Chi tiết sản phẩm
 *
 * Query params cho GET /api/products:
 *   keyword    - Tìm theo tên sản phẩm
 *   category   - Lọc theo maDanhMuc
 *   minPrice   - Giá tối thiểu
 *   maxPrice   - Giá tối đa
 *   page       - Trang (mặc định 1)
 *   limit      - Số item/trang (mặc định 12)
 *
 * Ví dụ:
 *   GET /api/products?keyword=gốm&category=1&minPrice=10000&maxPrice=100000&page=1&limit=12
 */

const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');

// ─────────────────────────────────────────────
// GET /api/products
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const {
            keyword,
            category,
            minPrice,
            maxPrice,
            page  = 1,
            limit = 12
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const request = new sql.Request();

        // Base query — chỉ lấy sản phẩm đang bán
        let where = `WHERE sp.trangThai = N'Đang bán'`;

        if (keyword) {
            where += ` AND sp.tenSanPham LIKE @keyword`;
            request.input('keyword', sql.NVarChar, `%${keyword}%`);
        }
        if (category) {
            where += ` AND sp.maDanhMuc = @category`;
            request.input('category', sql.Int, parseInt(category));
        }
        if (minPrice) {
            where += ` AND sp.gia >= @minPrice`;
            request.input('minPrice', sql.Decimal(10, 2), parseFloat(minPrice));
        }
        if (maxPrice) {
            where += ` AND sp.gia <= @maxPrice`;
            request.input('maxPrice', sql.Decimal(10, 2), parseFloat(maxPrice));
        }

        // Đếm tổng để phân trang
        const countResult = await request.query(`
            SELECT COUNT(*) AS total
            FROM SanPham sp
            ${where}
        `);
        const total = countResult.recordset[0].total;

        // Lấy dữ liệu trang hiện tại
        request.input('offset', sql.Int, offset);
        request.input('limit',  sql.Int, parseInt(limit));

        const result = await request.query(`
            SELECT
                sp.maSanPham,
                sp.tenSanPham,
                sp.gia,
                sp.moTa,
                sp.hinhAnh,
                dm.maDanhMuc,
                dm.tenDanhMuc,
                ISNULL(ct.soLuongTon, 0) AS soLuongTon,
                ISNULL(AVG(CAST(dg.soSao AS FLOAT)), 0) AS diemTrungBinh,
                COUNT(DISTINCT dg.maDanhGia) AS soLuongDanhGia
            FROM SanPham sp
            LEFT JOIN DanhMuc dm ON sp.maDanhMuc = dm.maDanhMuc
            LEFT JOIN ChiTietSanPham ct ON sp.maSanPham = ct.maSanPham
            LEFT JOIN DanhGia dg ON sp.maSanPham = dg.maSanPham
            ${where}
            GROUP BY
                sp.maSanPham, sp.tenSanPham, sp.gia, sp.moTa, sp.hinhAnh,
                dm.maDanhMuc, dm.tenDanhMuc, ct.soLuongTon
            ORDER BY sp.maSanPham DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);

        return res.json({
            success: true,
            data: result.recordset,
            pagination: {
                total,
                page:       parseInt(page),
                limit:      parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error('GET /products error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────────
// GET /api/products/:id
// Response: { success, data: { ...product, danhGia: [...] } }
// ─────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const request = new sql.Request();
        request.input('id', sql.Int, req.params.id);

        // Thông tin sản phẩm
        const productResult = await request.query(`
            SELECT
                sp.maSanPham,
                sp.tenSanPham,
                sp.gia,
                sp.moTa,
                sp.hinhAnh,
                sp.trangThai,
                dm.maDanhMuc,
                dm.tenDanhMuc,
                ISNULL(ct.soLuongTon, 0) AS soLuongTon,
                ISNULL(AVG(CAST(dg.soSao AS FLOAT)), 0) AS diemTrungBinh,
                COUNT(DISTINCT dg.maDanhGia) AS soLuongDanhGia
            FROM SanPham sp
            LEFT JOIN DanhMuc dm ON sp.maDanhMuc = dm.maDanhMuc
            LEFT JOIN ChiTietSanPham ct ON sp.maSanPham = ct.maSanPham
            LEFT JOIN DanhGia dg ON sp.maSanPham = dg.maSanPham
            WHERE sp.maSanPham = @id
            GROUP BY
                sp.maSanPham, sp.tenSanPham, sp.gia, sp.moTa, sp.hinhAnh, sp.trangThai,
                dm.maDanhMuc, dm.tenDanhMuc, ct.soLuongTon
        `);

        if (productResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm.'
            });
        }

        // Lấy đánh giá kèm phản hồi admin
        const reviewRequest = new sql.Request();
        reviewRequest.input('id', sql.Int, req.params.id);
        const reviewResult = await reviewRequest.query(`
            SELECT
                dg.maDanhGia,
                nd.ten AS tenNguoiDung,
                dg.soSao,
                dg.binhLuan,
                dg.ngayDanhGia,
                ph.noiDung AS phanHoiAdmin,
                ph.ngayTao  AS ngayPhanHoi
            FROM DanhGia dg
            LEFT JOIN NguoiDung nd ON dg.maNguoiDung = nd.maNguoiDung
            LEFT JOIN PhanHoiDanhGia ph ON dg.maDanhGia = ph.maDanhGia AND ph.trangThai = N'Hiển thị'
            WHERE dg.maSanPham = @id
            ORDER BY dg.ngayDanhGia DESC
        `);

        return res.json({
            success: true,
            data: {
                ...productResult.recordset[0],
                danhGia: reviewResult.recordset
            }
        });
    } catch (err) {
        console.error('GET /products/:id error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
