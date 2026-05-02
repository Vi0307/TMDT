const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');

// GET /api/admin/products?search=...
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        const request = new sql.Request();

        let query = `
            SELECT 
                sp.maSanPham,
                sp.tenSanPham,
                sp.gia,
                sp.moTa,
                sp.hinhAnh,
                dm.maDanhMuc,
                dm.tenDanhMuc,
                ISNULL(ct.soLuongTon, 0) AS soLuongTon
            FROM SanPham sp
            LEFT JOIN DanhMuc dm ON sp.maDanhMuc = dm.maDanhMuc
            LEFT JOIN ChiTietSanPham ct ON sp.maSanPham = ct.maSanPham
        `;

        if (search) {
            query += ` WHERE sp.tenSanPham LIKE @search OR CAST(sp.maSanPham AS NVARCHAR) LIKE @search`;
            request.input('search', sql.NVarChar, `%${search}%`);
        }

        query += ` ORDER BY sp.maSanPham DESC`;

        const result = await request.query(query);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('GET /products error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/admin/products/:id - Lấy chi tiết 1 sản phẩm
router.get('/:id', async (req, res) => {
    try {
        const request = new sql.Request();
        request.input('id', sql.Int, req.params.id);

        const result = await request.query(`
            SELECT 
                sp.maSanPham,
                sp.tenSanPham,
                sp.gia,
                sp.moTa,
                sp.hinhAnh,
                dm.maDanhMuc,
                dm.tenDanhMuc,
                ISNULL(ct.soLuongTon, 0) AS soLuongTon
            FROM SanPham sp
            LEFT JOIN DanhMuc dm ON sp.maDanhMuc = dm.maDanhMuc
            LEFT JOIN ChiTietSanPham ct ON sp.maSanPham = ct.maSanPham
            WHERE sp.maSanPham = @id
        `);

        if (result.recordset.length === 0)
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });

        res.json({ success: true, data: result.recordset[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/admin/products - Thêm sản phẩm mới
router.post('/', async (req, res) => {
    try {
        const { tenSanPham, gia, moTa, maDanhMuc, hinhAnh, soLuongTon } = req.body;

        if (!tenSanPham || !gia || !maDanhMuc)
            return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc (tên, giá, danh mục)' });

        const request = new sql.Request();
        request.input('tenSanPham', sql.NVarChar, tenSanPham);
        request.input('gia', sql.Decimal(10, 2), gia);
        request.input('moTa', sql.NVarChar, moTa || '');
        request.input('maDanhMuc', sql.Int, maDanhMuc);
        request.input('hinhAnh', sql.NVarChar, hinhAnh || '');

        // Thêm sản phẩm
        const result = await request.query(`
            INSERT INTO SanPham (tenSanPham, gia, moTa, maDanhMuc, hinhAnh)
            OUTPUT INSERTED.maSanPham
            VALUES (@tenSanPham, @gia, @moTa, @maDanhMuc, @hinhAnh)
        `);

        const maSanPham = result.recordset[0].maSanPham;

        // Thêm chi tiết tồn kho
        const request2 = new sql.Request();
        request2.input('maSanPham', sql.Int, maSanPham);
        request2.input('soLuongTon', sql.Int, soLuongTon || 0);
        await request2.query(`
            INSERT INTO ChiTietSanPham (maSanPham, soLuongTon)
            VALUES (@maSanPham, @soLuongTon)
        `);

        res.json({ success: true, maSanPham, message: 'Thêm sản phẩm thành công' });
    } catch (err) {
        console.error('POST /products error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/products/:id - Sửa sản phẩm
router.put('/:id', async (req, res) => {
    try {
        const { tenSanPham, gia, moTa, maDanhMuc, hinhAnh, soLuongTon } = req.body;

        if (!tenSanPham || !gia || !maDanhMuc)
            return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc (tên, giá, danh mục)' });

        const request = new sql.Request();
        request.input('id', sql.Int, req.params.id);
        request.input('tenSanPham', sql.NVarChar, tenSanPham);
        request.input('gia', sql.Decimal(10, 2), gia);
        request.input('moTa', sql.NVarChar, moTa || '');
        request.input('maDanhMuc', sql.Int, maDanhMuc);
        request.input('hinhAnh', sql.NVarChar, hinhAnh || '');

        await request.query(`
            UPDATE SanPham 
            SET tenSanPham = @tenSanPham, gia = @gia, moTa = @moTa, maDanhMuc = @maDanhMuc, hinhAnh = @hinhAnh
            WHERE maSanPham = @id
        `);

        // Cập nhật hoặc thêm mới tồn kho
        if (soLuongTon !== undefined) {
            const request2 = new sql.Request();
            request2.input('id', sql.Int, req.params.id);
            request2.input('soLuongTon', sql.Int, soLuongTon);
            await request2.query(`
                IF EXISTS (SELECT 1 FROM ChiTietSanPham WHERE maSanPham = @id)
                    UPDATE ChiTietSanPham SET soLuongTon = @soLuongTon WHERE maSanPham = @id
                ELSE
                    INSERT INTO ChiTietSanPham (maSanPham, soLuongTon) VALUES (@id, @soLuongTon)
            `);
        }

        res.json({ success: true, message: 'Cập nhật sản phẩm thành công' });
    } catch (err) {
        console.error('PUT /products/:id error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/admin/products/:id - Xóa sản phẩm
router.delete('/:id', async (req, res) => {
    try {
        const request = new sql.Request();
        request.input('id', sql.Int, req.params.id);

        // Kiểm tra sản phẩm có trong đơn hàng không
        const check = await request.query(`
            SELECT COUNT(*) AS cnt FROM ChiTietDonHang WHERE maSanPham = @id
        `);
        if (check.recordset[0].cnt > 0)
            return res.status(400).json({ success: false, message: 'Sản phẩm đã có trong đơn hàng, không thể xóa' });

        // Xóa chi tiết sản phẩm trước
        await request.query(`DELETE FROM ChiTietSanPham WHERE maSanPham = @id`);
        await request.query(`DELETE FROM SanPham WHERE maSanPham = @id`);

        res.json({ success: true, message: 'Xóa sản phẩm thành công' });
    } catch (err) {
        console.error('DELETE /products/:id error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
