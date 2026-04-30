const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');

// GET /api/admin/receipts?search=...
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        const request = new sql.Request();

        let query = `
            SELECT 
                pn.maPhieuNhap,
                pn.ngayNhap,
                pn.maNCC,
                ncc.tenNCC,
                ncc.thongTinLienHe
            FROM PhieuNhap pn
            LEFT JOIN NhaCungCap ncc ON pn.maNCC = ncc.maNCC
        `;

        if (search) {
            query += ` WHERE ncc.tenNCC LIKE @search OR CAST(pn.maPhieuNhap AS NVARCHAR) LIKE @search`;
            request.input('search', sql.NVarChar, `%${search}%`);
        }

        query += ` ORDER BY pn.maPhieuNhap DESC`;

        const result = await request.query(query);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/admin/receipts/suppliers - Lấy danh sách NCC cho dropdown
router.get('/suppliers', async (req, res) => {
    try {
        const request = new sql.Request();
        const result = await request.query(`SELECT maNCC, tenNCC FROM NhaCungCap ORDER BY tenNCC`);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/admin/receipts - Thêm phiếu nhập
router.post('/', async (req, res) => {
    try {
        const { maNCC, ngayNhap } = req.body;
        if (!maNCC || !ngayNhap)
            return res.status(400).json({ success: false, message: 'Thiếu mã NCC hoặc ngày nhập' });

        const request = new sql.Request();
        request.input('maNCC', sql.Int, maNCC);
        request.input('ngayNhap', sql.Date, ngayNhap);

        const result = await request.query(`
            INSERT INTO PhieuNhap (maNCC, ngayNhap)
            OUTPUT INSERTED.maPhieuNhap
            VALUES (@maNCC, @ngayNhap)
        `);

        res.json({ success: true, maPhieuNhap: result.recordset[0].maPhieuNhap });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/receipts/:id - Sửa phiếu nhập
router.put('/:id', async (req, res) => {
    try {
        const { maNCC, ngayNhap } = req.body;
        if (!maNCC || !ngayNhap)
            return res.status(400).json({ success: false, message: 'Thiếu mã NCC hoặc ngày nhập' });

        const request = new sql.Request();
        request.input('id', sql.Int, req.params.id);
        request.input('maNCC', sql.Int, maNCC);
        request.input('ngayNhap', sql.Date, ngayNhap);

        await request.query(`UPDATE PhieuNhap SET maNCC = @maNCC, ngayNhap = @ngayNhap WHERE maPhieuNhap = @id`);
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/admin/receipts/:id - Xóa phiếu nhập
router.delete('/:id', async (req, res) => {
    try {
        const request = new sql.Request();
        request.input('id', sql.Int, req.params.id);

        // Xóa chi tiết trước rồi mới xóa phiếu
        await request.query(`DELETE FROM ChiTietPhieuNhap WHERE maPhieuNhap = @id`);
        await request.query(`DELETE FROM PhieuNhap WHERE maPhieuNhap = @id`);

        res.json({ success: true, message: 'Xóa thành công' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
