const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');

// GET /api/admin/categories?search=...
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        const request = new sql.Request();

        let query = `
            SELECT 
                dm.maDanhMuc,
                dm.tenDanhMuc,
                COUNT(sp.maSanPham) AS soLuongSanPham
            FROM DanhMuc dm
            LEFT JOIN SanPham sp ON dm.maDanhMuc = sp.maDanhMuc
        `;

        if (search) {
            query += ` WHERE dm.tenDanhMuc LIKE @search`;
            request.input('search', sql.NVarChar, `%${search}%`);
        }

        query += ` GROUP BY dm.maDanhMuc, dm.tenDanhMuc ORDER BY dm.maDanhMuc ASC`;

        const result = await request.query(query);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/admin/categories - Thêm danh mục
router.post('/', async (req, res) => {
    try {
        const { tenDanhMuc } = req.body;
        if (!tenDanhMuc)
            return res.status(400).json({ success: false, message: 'Thiếu tên danh mục' });

        const request = new sql.Request();
        request.input('tenDanhMuc', sql.NVarChar, tenDanhMuc);
        const result = await request.query(`
            INSERT INTO DanhMuc (tenDanhMuc) 
            OUTPUT INSERTED.maDanhMuc
            VALUES (@tenDanhMuc)
        `);

        res.json({ success: true, maDanhMuc: result.recordset[0].maDanhMuc });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/categories/:id - Sửa danh mục
router.put('/:id', async (req, res) => {
    try {
        const { tenDanhMuc } = req.body;
        if (!tenDanhMuc)
            return res.status(400).json({ success: false, message: 'Thiếu tên danh mục' });

        const request = new sql.Request();
        request.input('id', sql.Int, req.params.id);
        request.input('tenDanhMuc', sql.NVarChar, tenDanhMuc);
        await request.query(`UPDATE DanhMuc SET tenDanhMuc = @tenDanhMuc WHERE maDanhMuc = @id`);

        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/admin/categories/:id - Xóa danh mục
router.delete('/:id', async (req, res) => {
    try {
        const request = new sql.Request();
        request.input('id', sql.Int, req.params.id);

        // Kiểm tra còn sản phẩm không
        const check = await request.query(`SELECT COUNT(*) AS cnt FROM SanPham WHERE maDanhMuc = @id`);
        if (check.recordset[0].cnt > 0)
            return res.status(400).json({ success: false, message: 'Danh mục còn sản phẩm, không thể xóa' });

        await request.query(`DELETE FROM DanhMuc WHERE maDanhMuc = @id`);
        res.json({ success: true, message: 'Xóa thành công' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
