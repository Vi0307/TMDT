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

// GET /api/admin/returns/:id - Lấy chi tiết yêu cầu hoàn hàng đầy đủ
router.get('/:id', async (req, res) => {
    try {
        const request = new sql.Request();
        request.input('id', sql.Int, req.params.id);

        const returnRes = await request.query(`
            SELECT 
                yc.maYeuCau,
                yc.maDonHang,
                yc.lyDo,
                yc.ghiChu,
                yc.ngayYeuCau,
                tt.tenTrangThai,
                nd.ten AS tenKhachHang,
                nd.soDienThoai,
                nd.email,
                pt.phuongThuc
            FROM YeuCauHoanHang yc
            INNER JOIN TrangThai tt ON yc.maTrangThai = tt.maTrangThai AND tt.loai = 'RETURN'
            LEFT JOIN NguoiDung nd ON yc.maNguoiDung = nd.maNguoiDung
            LEFT JOIN DonHang dh ON yc.maDonHang = dh.maDonHang
            LEFT JOIN PhuongThucThanhToan pt ON dh.maPTTT = pt.maPTTT
            WHERE yc.maYeuCau = @id
        `);

        if (returnRes.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu hoàn hàng' });
        }

        const returnInfo = returnRes.recordset[0];
        
        // Lấy danh sách sản phẩm trong đơn hàng
        const productsRequest = new sql.Request();
        productsRequest.input('maDonHang', sql.Int, returnInfo.maDonHang);
        const productsRes = await productsRequest.query(`
            SELECT 
                ct.maSanPham,
                sp.tenSanPham,
                ct.soLuong,
                ct.gia
            FROM ChiTietDonHang ct
            INNER JOIN SanPham sp ON ct.maSanPham = sp.maSanPham
            WHERE ct.maDonHang = @maDonHang
        `);

        returnInfo.sanPham = productsRes.recordset;

        res.json({ success: true, data: returnInfo });
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
