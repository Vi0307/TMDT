const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');

// GET /api/admin/returns?search=...&status=...
router.get('/', async (req, res) => {
    try {
        const { search, status } = req.query;
        const request = new sql.Request();

        let query = `
            SELECT 
                yc.maYeuCau,
                yc.maDonHang,
                nd.ten AS tenKhachHang,
                yc.lyDo,
                yc.ghiChu,
                yc.ngayYeuCau,
                tt.tenTrangThai
            FROM YeuCauHoanHang yc
            INNER JOIN TrangThai tt ON yc.maTrangThai = tt.maTrangThai AND tt.loai = 'RETURN'
            LEFT JOIN DonHang dh ON yc.maDonHang = dh.maDonHang
            LEFT JOIN NguoiDung nd ON yc.maNguoiDung = nd.maNguoiDung
            WHERE 1=1
        `;

        if (search) {
            query += ` AND (nd.ten LIKE @search OR CAST(yc.maDonHang AS NVARCHAR) LIKE @search OR yc.lyDo LIKE @search)`;
            request.input('search', sql.NVarChar, `%${search}%`);
        }

        if (status && status !== 'all') {
            query += ` AND tt.tenTrangThai = @trangThai`;
            request.input('trangThai', sql.NVarChar, status);
        }

        query += ` ORDER BY yc.ngayYeuCau DESC`;

        const result = await request.query(query);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/returns/:id/approve - Xác nhận hoàn hàng
router.put('/:id/approve', async (req, res) => {
    try {
        const request = new sql.Request();
        request.input('id', sql.Int, req.params.id);

        await request.query(`
            UPDATE YeuCauHoanHang 
            SET maTrangThai = (SELECT maTrangThai FROM TrangThai WHERE tenTrangThai = N'Đã duyệt hoàn' AND loai = 'RETURN'),
                ngayXuLy = GETDATE()
            WHERE maYeuCau = @id
        `);

        res.json({ success: true, message: 'Đã xác nhận hoàn hàng' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/returns/:id/reject - Từ chối hoàn hàng
router.put('/:id/reject', async (req, res) => {
    try {
        const request = new sql.Request();
        request.input('id', sql.Int, req.params.id);

        await request.query(`
            UPDATE YeuCauHoanHang 
            SET maTrangThai = (SELECT maTrangThai FROM TrangThai WHERE tenTrangThai = N'Từ chối hoàn' AND loai = 'RETURN'),
                ngayXuLy = GETDATE()
            WHERE maYeuCau = @id
        `);

        res.json({ success: true, message: 'Đã từ chối yêu cầu hoàn hàng' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
