/**
 * user/transactions.js
 * API lịch sử giao dịch thanh toán (yêu cầu đăng nhập)
 *
 * Routes:
 *   GET /api/transactions/my  - Lịch sử giao dịch của tôi
 *
 * Ví dụ response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "maGiaoDich": 1,
 *       "loaiGiaoDich": "PAYMENT",
 *       "soTien": 45000,
 *       "trangThai": "Thành công",
 *       "momoCode": "MOMO123",
 *       "thoiGian": "2024-01-01T10:00:00",
 *       "maDonHang": 1,
 *       "phuongThuc": "COD"
 *     }
 *   ]
 * }
 */

const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

// ─────────────────────────────────────────────
// GET /api/transactions/my
// Query: page, limit, loai (PAYMENT|REFUND)
// ─────────────────────────────────────────────
router.get('/my', async (req, res) => {
    try {
        const { page = 1, limit = 10, loai } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const request = new sql.Request();
        request.input('maNguoiDung', sql.Int, req.user.id);
        request.input('offset',      sql.Int, offset);
        request.input('limit',       sql.Int, parseInt(limit));

        let where = `WHERE dh.maNguoiDung = @maNguoiDung`;

        if (loai && ['PAYMENT', 'REFUND'].includes(loai.toUpperCase())) {
            where += ` AND gd.loaiGiaoDich = @loai`;
            request.input('loai', sql.NVarChar, loai.toUpperCase());
        }

        const countResult = await request.query(`
            SELECT COUNT(*) AS total
            FROM GiaoDich gd
            INNER JOIN DonHang dh ON gd.maDonHang = dh.maDonHang
            ${where}
        `);
        const total = countResult.recordset[0].total;

        const result = await request.query(`
            SELECT
                gd.maGiaoDich,
                gd.loaiGiaoDich,
                gd.soTien,
                gd.momoCode,
                gd.thoiGian,
                gd.maDonHang,
                tt.tenTrangThai AS trangThai,
                pttt.phuongThuc AS phuongThuc
            FROM GiaoDich gd
            INNER JOIN DonHang dh ON gd.maDonHang = dh.maDonHang
            LEFT JOIN TrangThai tt ON gd.maTrangThai = tt.maTrangThai
            LEFT JOIN PhuongThucThanhToan pttt ON dh.maPTTT = pttt.maPTTT
            ${where}
            ORDER BY gd.thoiGian DESC
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
        console.error('GET /transactions/my error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
