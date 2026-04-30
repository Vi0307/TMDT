const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');

// GET /api/admin/users?search=...
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        const request = new sql.Request();

        let query = `
            SELECT 
                nd.maNguoiDung,
                nd.ten,
                nd.email,
                nd.soDienThoai,
                nd.diaChi,
                nd.vaiTro,
                v.trangThai
            FROM NguoiDung nd
            LEFT JOIN ViDienTu v ON nd.maNguoiDung = v.maNguoiDung
            WHERE nd.vaiTro = 'USER'
        `;

        if (search) {
            query += ` AND (nd.ten LIKE @search OR nd.email LIKE @search OR nd.soDienThoai LIKE @search)`;
            request.input('search', sql.NVarChar, `%${search}%`);
        }

        query += ` ORDER BY nd.maNguoiDung DESC`;

        const result = await request.query(query);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/admin/users/:id
router.get('/:id', async (req, res) => {
    try {
        const request = new sql.Request();
        request.input('id', sql.Int, req.params.id);
        const result = await request.query(`
            SELECT nd.maNguoiDung, nd.ten, nd.email, nd.soDienThoai, nd.diaChi, nd.vaiTro,
                   v.soDu, v.trangThai
            FROM NguoiDung nd
            LEFT JOIN ViDienTu v ON nd.maNguoiDung = v.maNguoiDung
            WHERE nd.maNguoiDung = @id
        `);

        if (result.recordset.length === 0)
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

        res.json({ success: true, data: result.recordset[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/users/:id/status - Khóa / Mở khóa
router.put('/:id/status', async (req, res) => {
    try {
        const { trangThai } = req.body;
        if (!trangThai)
            return res.status(400).json({ success: false, message: 'Thiếu trạng thái' });

        const request = new sql.Request();
        request.input('id', sql.Int, req.params.id);
        request.input('trangThai', sql.NVarChar, trangThai);
        await request.query(`UPDATE ViDienTu SET trangThai = @trangThai WHERE maNguoiDung = @id`);

        res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
