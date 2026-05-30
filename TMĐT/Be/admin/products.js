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
                sp.moTaNgan                    AS moTa,
                dm.maDanhMuc,
                dm.tenDanhMuc,
                ctsp.gia,
                ctsp.hinhAnh,
                ctsp.trangThai,
                ISNULL(ctsp.soLuongTon, 0)     AS soLuongTon
            FROM SanPham sp
            LEFT JOIN DanhMuc dm         ON sp.maDanhMuc  = dm.maDanhMuc
            LEFT JOIN ChiTietSanPham ctsp ON sp.maSanPham = ctsp.maSanPham
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
        request.input('id', sql.NVarChar(10), req.params.id);

        const result = await request.query(`
            SELECT 
                sp.maSanPham,
                sp.tenSanPham,
                sp.moTaNgan                    AS moTa,
                dm.maDanhMuc,
                dm.tenDanhMuc,
                ctsp.gia,
                ctsp.hinhAnh,
                ctsp.trangThai,
                ISNULL(ctsp.soLuongTon, 0)     AS soLuongTon
            FROM SanPham sp
            LEFT JOIN DanhMuc dm         ON sp.maDanhMuc  = dm.maDanhMuc
            LEFT JOIN ChiTietSanPham ctsp ON sp.maSanPham = ctsp.maSanPham
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

        // Thêm vào SanPham (không có gia/hinhAnh/trangThai nữa)
        const request = new sql.Request();
        
        // Tự động sinh mã sản phẩm tiếp theo (SPxx)
        const idResult = await request.query(`SELECT maSanPham FROM SanPham WHERE maSanPham LIKE 'SP%'`);
        let maxNum = 0;
        idResult.recordset.forEach(row => {
            if (row.maSanPham) {
                const num = parseInt(row.maSanPham.substring(2), 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            }
        });
        const nextNum = maxNum + 1;
        const newMaSanPham = 'SP' + String(nextNum).padStart(2, '0');

        request.input('maSanPham',  sql.NVarChar(10),  newMaSanPham);
        request.input('tenSanPham', sql.NVarChar(100), tenSanPham);
        request.input('moTaNgan',   sql.NVarChar,      moTa || '');
        request.input('maDanhMuc',  sql.Int,           maDanhMuc);

        const result = await request.query(`
            INSERT INTO SanPham (maSanPham, tenSanPham, moTaNgan, maDanhMuc)
            OUTPUT INSERTED.maSanPham
            VALUES (@maSanPham, @tenSanPham, @moTaNgan, @maDanhMuc)
        `);

        const maSanPham = result.recordset[0].maSanPham;

        // Thêm vào ChiTietSanPham (gia, hinhAnh, trangThai, soLuongTon)
        const req2 = new sql.Request();
        req2.input('maSanPham',  sql.NVarChar(10),  maSanPham);
        req2.input('gia',        sql.Decimal(10,2), parseFloat(gia));
        req2.input('hinhAnh',    sql.NVarChar(255), hinhAnh || '');
        req2.input('soLuongTon', sql.Int,           parseInt(soLuongTon) || 0);

        await req2.query(`
            INSERT INTO ChiTietSanPham (maSanPham, gia, hinhAnh, soLuongTon)
            VALUES (@maSanPham, @gia, @hinhAnh, @soLuongTon)
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

        // Cập nhật SanPham
        const request = new sql.Request();
        request.input('id',        sql.NVarChar(10),  req.params.id);
        request.input('tenSanPham', sql.NVarChar(100), tenSanPham);
        request.input('moTaNgan',   sql.NVarChar,      moTa || '');
        request.input('maDanhMuc',  sql.Int,           maDanhMuc);

        await request.query(`
            UPDATE SanPham
            SET tenSanPham = @tenSanPham, moTaNgan = @moTaNgan, maDanhMuc = @maDanhMuc
            WHERE maSanPham = @id
        `);

        // Cập nhật ChiTietSanPham
        const req2 = new sql.Request();
        req2.input('id',         sql.NVarChar(10),  req.params.id);
        req2.input('gia',        sql.Decimal(10,2), parseFloat(gia));
        req2.input('hinhAnh',    sql.NVarChar(255), hinhAnh || '');
        req2.input('soLuongTon', sql.Int,           parseInt(soLuongTon) || 0);

        await req2.query(`
            IF EXISTS (SELECT 1 FROM ChiTietSanPham WHERE maSanPham = @id)
                UPDATE ChiTietSanPham
                SET gia = @gia, hinhAnh = @hinhAnh, soLuongTon = @soLuongTon
                WHERE maSanPham = @id
            ELSE
                INSERT INTO ChiTietSanPham (maSanPham, gia, hinhAnh, soLuongTon)
VALUES (@id, @gia, @hinhAnh, @soLuongTon)
        `);

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
        request.input('id', sql.NVarChar(10), req.params.id);

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
