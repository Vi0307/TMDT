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

        // Chạy Transaction bằng T-SQL để đảm bảo an toàn dữ liệu:
        // 1. Cập nhật trạng thái hoàn hàng
        // 2. Cộng tiền vào Ví điện tử của người dùng
        // 3. Lưu lịch sử giao dịch hoàn tiền
        await request.query(`
            DECLARE @maDonHang INT;
            DECLARE @maNguoiDung INT;
            DECLARE @tongTien DECIMAL(10,2);

            -- Lấy thông tin đơn hàng và người dùng từ yêu cầu hoàn
            SELECT 
                @maDonHang = maDonHang,
                @maNguoiDung = maNguoiDung
            FROM YeuCauHoanHang
            WHERE maYeuCau = @id;

            -- Lấy số tiền cần hoàn từ đơn hàng
            SELECT @tongTien = tongTien
            FROM DonHang
            WHERE maDonHang = @maDonHang;

            BEGIN TRANSACTION;
            BEGIN TRY
                -- Cập nhật trạng thái hoàn hàng sang 'Đã duyệt hoàn'
                UPDATE YeuCauHoanHang 
                SET maTrangThai = (SELECT maTrangThai FROM TrangThai WHERE tenTrangThai = N'Đã duyệt hoàn' AND loai = 'RETURN'),
                    ngayXuLy = GETDATE()
                WHERE maYeuCau = @id;

                -- Hoàn tiền vào ví điện tử của khách hàng
                IF NOT EXISTS (SELECT 1 FROM ViDienTu WHERE maNguoiDung = @maNguoiDung)
                BEGIN
                    INSERT INTO ViDienTu (maNguoiDung, soDu, trangThai)
                    VALUES (@maNguoiDung, @tongTien, N'Hoạt động');
                END
                ELSE
                BEGIN
                    UPDATE ViDienTu
                    SET soDu = soDu + @tongTien
                    WHERE maNguoiDung = @maNguoiDung;
                END

                -- Thêm lịch sử giao dịch REFUND với trạng thái 'Đã hoàn tiền'
                INSERT INTO GiaoDich (loaiGiaoDich, thoiGian, maTrangThai, soTien, maDonHang)
                VALUES (
                    'REFUND', 
                    GETDATE(), 
                    (SELECT maTrangThai FROM TrangThai WHERE tenTrangThai = N'Đã hoàn tiền' AND loai = 'PAYMENT'), 
                    @tongTien, 
                    @maDonHang
                );

                COMMIT TRANSACTION;
            END TRY
            BEGIN CATCH
                ROLLBACK TRANSACTION;
                THROW;
            END CATCH
        `);

        res.json({ success: true, message: 'Đã xác nhận hoàn hàng và hoàn tiền vào ví khách hàng thành công.' });
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
