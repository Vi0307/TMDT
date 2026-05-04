/**
 * user/returns.user.js
 * API yêu cầu hoàn hàng cho người dùng (yêu cầu đăng nhập)
 *
 * Routes:
 *   POST /api/returns              - Gửi yêu cầu hoàn hàng
 *   GET  /api/returns/my-returns   - Danh sách yêu cầu hoàn hàng của tôi
 *
 * Ví dụ POST /api/returns:
 * {
 *   "maDonHang": 1,
 *   "lyDo": "Sản phẩm bị lỗi khi nhận hàng"
 * }
 *
 * Điều kiện:
 *   - Đơn hàng phải ở trạng thái "Đã giao"
 *   - Mỗi đơn chỉ gửi 1 yêu cầu hoàn hàng
 */

const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

// ─────────────────────────────────────────────
// POST /api/returns — Gửi yêu cầu hoàn hàng
// ─────────────────────────────────────────────
router.post('/', async (req, res) => {
    const { maDonHang, lyDo } = req.body;

    if (!maDonHang || !lyDo) {
        return res.status(400).json({
            success: false,
            message: 'Thiếu thông tin: maDonHang, lyDo'
        });
    }

    try {
        // Kiểm tra đơn hàng tồn tại và thuộc user
        const orderReq = new sql.Request();
        orderReq.input('maDonHang',   sql.Int, maDonHang);
        orderReq.input('maNguoiDung', sql.Int, req.user.id);
        const orderResult = await orderReq.query(`
            SELECT dh.maDonHang, tt.tenTrangThai
            FROM DonHang dh
            INNER JOIN TrangThai tt ON dh.maTrangThai = tt.maTrangThai
            WHERE dh.maDonHang = @maDonHang AND dh.maNguoiDung = @maNguoiDung
        `);

        if (orderResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
        }

        const { tenTrangThai } = orderResult.recordset[0];
        if (tenTrangThai !== 'Đã giao') {
            return res.status(400).json({
                success: false,
                message: `Chỉ có thể yêu cầu hoàn hàng khi đơn ở trạng thái "Đã giao". Trạng thái hiện tại: "${tenTrangThai}".`
            });
        }

        // Kiểm tra đã có yêu cầu hoàn hàng chưa
        const existReq = new sql.Request();
        existReq.input('maDonHang', sql.Int, maDonHang);
        const existing = await existReq.query(`
            SELECT maYeuCau FROM YeuCauHoanHang WHERE maDonHang = @maDonHang
        `);
        if (existing.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Đơn hàng này đã có yêu cầu hoàn hàng.'
            });
        }

        // Lấy maTrangThai "Chờ duyệt hoàn"
        const ttReq = new sql.Request();
        const ttResult = await ttReq.query(`
            SELECT maTrangThai FROM TrangThai
            WHERE tenTrangThai = N'Chờ duyệt hoàn' AND loai = 'RETURN'
        `);
        const maTrangThai = ttResult.recordset[0].maTrangThai;

        // Tạo yêu cầu hoàn hàng
        const insertReq = new sql.Request();
        insertReq.input('maDonHang',   sql.Int,     maDonHang);
        insertReq.input('maNguoiDung', sql.Int,     req.user.id);
        insertReq.input('lyDo',        sql.NVarChar, lyDo);
        insertReq.input('maTrangThai', sql.Int,     maTrangThai);

        const result = await insertReq.query(`
            INSERT INTO YeuCauHoanHang (maDonHang, maNguoiDung, lyDo, maTrangThai)
            OUTPUT INSERTED.maYeuCau, INSERTED.ngayYeuCau
            VALUES (@maDonHang, @maNguoiDung, @lyDo, @maTrangThai)
        `);

        return res.status(201).json({
            success: true,
            message: 'Yêu cầu hoàn hàng đã được gửi. Chúng tôi sẽ xử lý trong 1-3 ngày làm việc.',
            data: result.recordset[0]
        });
    } catch (err) {
        console.error('POST /returns error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────────
// GET /api/returns/my-returns — Danh sách yêu cầu hoàn hàng
// Query: page, limit
// ─────────────────────────────────────────────
router.get('/my-returns', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const request = new sql.Request();
        request.input('maNguoiDung', sql.Int, req.user.id);
        request.input('offset',      sql.Int, offset);
        request.input('limit',       sql.Int, parseInt(limit));

        const countResult = await request.query(`
            SELECT COUNT(*) AS total
            FROM YeuCauHoanHang
            WHERE maNguoiDung = @maNguoiDung
        `);
        const total = countResult.recordset[0].total;

        const result = await request.query(`
            SELECT
                yc.maYeuCau,
                yc.maDonHang,
                yc.lyDo,
                yc.ghiChu,
                yc.ngayYeuCau,
                yc.ngayXuLy,
                tt.tenTrangThai AS trangThai,
                dh.tongTien     AS tongTienDonHang
            FROM YeuCauHoanHang yc
            INNER JOIN TrangThai tt ON yc.maTrangThai = tt.maTrangThai
            LEFT JOIN DonHang dh ON yc.maDonHang = dh.maDonHang
            WHERE yc.maNguoiDung = @maNguoiDung
            ORDER BY yc.ngayYeuCau DESC
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
        console.error('GET /returns/my-returns error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
