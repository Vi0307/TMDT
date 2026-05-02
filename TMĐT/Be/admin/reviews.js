const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');

// GET /api/admin/reviews?search=...&status=...
router.get('/', async (req, res) => {
    try {
        const { search, status } = req.query;
        const request = new sql.Request();

        let query = `
            SELECT 
                dg.maDanhGia,
                nd.ten AS tenKhachHang,
                sp.tenSanPham,
                dg.soSao,
                dg.binhLuan,
                ph.maPhanHoi,
                ph.tieuDe AS tieuDePhanHoi,
                ph.noiDung AS noiDungPhanHoi,
                ph.trangThai AS trangThaiPhanHoi
            FROM DanhGia dg
            LEFT JOIN NguoiDung nd ON dg.maNguoiDung = nd.maNguoiDung
            LEFT JOIN SanPham sp ON dg.maSanPham = sp.maSanPham
            LEFT JOIN PhanHoiDanhGia ph ON dg.maDanhGia = ph.maDanhGia
            WHERE 1=1
        `;

        if (search) {
            query += ` AND (nd.ten LIKE @search OR sp.tenSanPham LIKE @search OR dg.binhLuan LIKE @search)`;
            request.input('search', sql.NVarChar, `%${search}%`);
        }

        if (status && status !== 'all') {
            if (status === 'Đã phản hồi') {
                query += ` AND ph.maPhanHoi IS NOT NULL`;
            } else {
                query += ` AND ph.maPhanHoi IS NULL`;
            }
        }

        query += ` ORDER BY dg.maDanhGia DESC`;

        const result = await request.query(query);

        const data = result.recordset.map(row => ({
            maDanhGia: row.maDanhGia,
            tenKhachHang: row.tenKhachHang,
            tenSanPham: row.tenSanPham,
            soSao: row.soSao,
            binhLuan: row.binhLuan,
            trangThai: row.maPhanHoi ? 'Đã phản hồi' : 'Chưa phản hồi',
            maPhanHoi: row.maPhanHoi,
            tieuDePhanHoi: row.tieuDePhanHoi || '',
            noiDungPhanHoi: row.noiDungPhanHoi || ''
        }));

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/admin/reviews/:id/reply - Thêm phản hồi mới
router.post('/:id/reply', async (req, res) => {
    try {
        const { tieuDe, noiDung } = req.body;
        if (!tieuDe || !noiDung)
            return res.status(400).json({ success: false, message: 'Thiếu tiêu đề hoặc nội dung' });

        const request = new sql.Request();
        request.input('maDanhGia', sql.Int, req.params.id);
        request.input('tieuDe', sql.NVarChar, tieuDe);
        request.input('noiDung', sql.NVarChar, noiDung);

        // maNguoiDung = 1 (Admin)
        await request.query(`
            INSERT INTO PhanHoiDanhGia (maNguoiDung, tieuDe, noiDung, trangThai, ngayTao, maDanhGia)
            VALUES (1, @tieuDe, @noiDung, N'Hiển thị', GETDATE(), @maDanhGia)
        `);

        res.json({ success: true, message: 'Đã gửi phản hồi thành công' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/reviews/reply/:replyId - Sửa phản hồi
router.put('/reply/:replyId', async (req, res) => {
    try {
        const { tieuDe, noiDung } = req.body;
        if (!tieuDe || !noiDung)
            return res.status(400).json({ success: false, message: 'Thiếu tiêu đề hoặc nội dung' });

        const request = new sql.Request();
        request.input('replyId', sql.Int, req.params.replyId);
        request.input('tieuDe', sql.NVarChar, tieuDe);
        request.input('noiDung', sql.NVarChar, noiDung);

        await request.query(`
            UPDATE PhanHoiDanhGia SET tieuDe = @tieuDe, noiDung = @noiDung WHERE maPhanHoi = @replyId
        `);

        res.json({ success: true, message: 'Cập nhật phản hồi thành công' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
