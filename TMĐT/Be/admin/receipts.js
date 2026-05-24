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
                pn.tongTien,
                ncc.tenNCC,
                ncc.soDienThoai,
                ncc.email
            FROM PhieuNhap pn
            LEFT JOIN NhaCungCap ncc ON pn.maNCC = ncc.maNCC
        `;

        if (search) {
            query += ` WHERE ncc.tenNCC LIKE @search OR CAST(pn.maPhieuNhap AS NVARCHAR) LIKE @search`;
            request.input('search', sql.NVarChar, `%${search}%`);
        }

        query += ` ORDER BY pn.maPhieuNhap ASC`;

        const result = await request.query(query);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('GET /receipts error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/admin/receipts/suppliers - Lấy danh sách NCC cho dropdown kèm tên sản phẩm cung cấp
router.get('/suppliers', async (req, res) => {
    try {
        const request = new sql.Request();
        const result = await request.query(`
            SELECT 
                ncc.maNCC, 
                ncc.tenNCC,
                STRING_AGG(sp.tenSanPham, ', ') AS tenSanPhamCungCap
            FROM NhaCungCap ncc
            LEFT JOIN NCC_SanPham nsp ON ncc.maNCC = nsp.maNCC
            LEFT JOIN SanPham sp ON nsp.maSanPham = sp.maSanPham
            GROUP BY ncc.maNCC, ncc.tenNCC
            ORDER BY ncc.maNCC
        `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/admin/receipts/suppliers/:id/products - Sản phẩm của NCC (sử dụng bảng trung gian NCC_SanPham)
router.get('/suppliers/:id/products', async (req, res) => {
    try {
        const request = new sql.Request();
        request.input('maNCC', sql.Int, req.params.id);
        const result = await request.query(`
            SELECT
                sp.maSanPham,
                sp.tenSanPham,
                dm.tenDanhMuc,
                ctsp.gia AS giaBan
            FROM SanPham sp
            INNER JOIN DanhMuc dm          ON sp.maDanhMuc  = dm.maDanhMuc
            INNER JOIN NCC_SanPham nsp     ON sp.maSanPham  = nsp.maSanPham
            INNER JOIN ChiTietSanPham ctsp  ON sp.maSanPham  = ctsp.maSanPham
            WHERE nsp.maNCC = @maNCC
              AND ctsp.trangThai = N'Đang bán'
            ORDER BY sp.maSanPham
        `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/admin/receipts/:id/details - Chi tiết phiếu nhập (sản phẩm trong phiếu)
router.get('/:id/details', async (req, res) => {
    try {
        const request = new sql.Request();
        request.input('id', sql.Int, req.params.id);

        // Thông tin phiếu nhập
        const headerResult = await request.query(`
            SELECT
                pn.maPhieuNhap,
                pn.maNCC,
                pn.ngayNhap,
                pn.tongTien,
                pn.ghiChu,
                ncc.tenNCC,
                ncc.email      AS emailNCC,
                ncc.soDienThoai AS sdtNCC,
                ncc.diaChi     AS diaChiNCC
            FROM PhieuNhap pn
            LEFT JOIN NhaCungCap ncc ON pn.maNCC = ncc.maNCC
            WHERE pn.maPhieuNhap = @id
        `);

        if (headerResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu nhập.' });
        }

        // Chi tiết sản phẩm trong phiếu
        const detailReq = new sql.Request();
        detailReq.input('id', sql.Int, req.params.id);
        const detailResult = await detailReq.query(`
            SELECT
                ct.maSanPham,
                sp.tenSanPham,
                ctsp.hinhAnh,
                ct.soLuong,
                ct.giaNhap,
                (ct.soLuong * ct.giaNhap) AS thanhTien
            FROM ChiTietPhieuNhap ct
            INNER JOIN SanPham sp       ON ct.maSanPham  = sp.maSanPham
            LEFT  JOIN ChiTietSanPham ctsp ON sp.maSanPham = ctsp.maSanPham
            WHERE ct.maPhieuNhap = @id
            ORDER BY ct.maSanPham
        `);

        return res.json({
            success: true,
            data: {
                ...headerResult.recordset[0],
                chiTiet: detailResult.recordset
            }
        });
    } catch (err) {
        console.error('GET /receipts/:id/details error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/admin/receipts - Thêm phiếu nhập
router.post('/', async (req, res) => {
    try {
        const { maNCC, ngayNhap, chiTiet, ghiChu } = req.body;
        if (!maNCC || !ngayNhap)
            return res.status(400).json({ success: false, message: 'Thiếu mã NCC hoặc ngày nhập' });

        // Lấy maNguoiTao từ token (req.user được gắn bởi authMiddleware)
        const maNguoiTao = req.user?.maNguoiDung || 1;

        // Tạo phiếu nhập
        const request = new sql.Request();
        request.input('maNCC',      sql.Int,          maNCC);
        request.input('ngayNhap',   sql.Date,         ngayNhap);
        request.input('maNguoiTao', sql.Int,          maNguoiTao);
        request.input('ghiChu',     sql.NVarChar(255), ghiChu || null);

        const result = await request.query(`
            INSERT INTO PhieuNhap (maNCC, maNguoiTao, ngayNhap, ghiChu)
            OUTPUT INSERTED.maPhieuNhap
            VALUES (@maNCC, @maNguoiTao, @ngayNhap, @ghiChu)
        `);

        const maPhieuNhap = result.recordset[0].maPhieuNhap;

        // Thêm chi tiết sản phẩm nếu có
        if (chiTiet && Array.isArray(chiTiet) && chiTiet.length > 0) {
            let tongTien = 0;

            for (const item of chiTiet) {
                if (!item.maSanPham || !item.soLuong || !item.giaNhap) continue;

                const detailReq = new sql.Request();
                detailReq.input('maPhieuNhap', sql.Int,          maPhieuNhap);
                detailReq.input('maSanPham',   sql.NVarChar(10),  item.maSanPham);
                detailReq.input('soLuong',     sql.Int,          parseInt(item.soLuong));
                detailReq.input('giaNhap',     sql.Decimal(10,2), parseFloat(item.giaNhap));

                await detailReq.query(`
                    INSERT INTO ChiTietPhieuNhap (maPhieuNhap, maSanPham, soLuong, giaNhap)
                    VALUES (@maPhieuNhap, @maSanPham, @soLuong, @giaNhap)
                `);

                // Cộng tồn kho
                const stockReq = new sql.Request();
                stockReq.input('maSanPham', sql.NVarChar(10), item.maSanPham);
                stockReq.input('soLuong',   sql.Int,          parseInt(item.soLuong));
                await stockReq.query(`
                    UPDATE ChiTietSanPham
                    SET soLuongTon = soLuongTon + @soLuong
                    WHERE maSanPham = @maSanPham
                `);

                tongTien += parseInt(item.soLuong) * parseFloat(item.giaNhap);
            }

            // Cập nhật tổng tiền phiếu nhập
            const updateReq = new sql.Request();
            updateReq.input('maPhieuNhap', sql.Int,          maPhieuNhap);
            updateReq.input('tongTien',    sql.Decimal(10,2), tongTien);
            await updateReq.query(`
                UPDATE PhieuNhap SET tongTien = @tongTien WHERE maPhieuNhap = @maPhieuNhap
            `);
        }

        res.json({ success: true, maPhieuNhap, message: 'Thêm phiếu nhập thành công' });
    } catch (err) {
        console.error('POST /receipts error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/receipts/:id - Sửa phiếu nhập (NCC, ngày, ghi chú, chi tiết sản phẩm)
router.put('/:id', async (req, res) => {
    try {
        const { maNCC, ngayNhap, ghiChu, chiTiet } = req.body;
        if (!maNCC || !ngayNhap)
            return res.status(400).json({ success: false, message: 'Thiếu mã NCC hoặc ngày nhập' });

        const id = parseInt(req.params.id);

        // Cập nhật thông tin phiếu nhập
        const request = new sql.Request();
        request.input('id',       sql.Int,          id);
        request.input('maNCC',    sql.Int,          maNCC);
        request.input('ngayNhap', sql.Date,         ngayNhap);
        request.input('ghiChu',   sql.NVarChar(255), ghiChu || null);

        await request.query(`
            UPDATE PhieuNhap
            SET maNCC = @maNCC, ngayNhap = @ngayNhap, ghiChu = @ghiChu
            WHERE maPhieuNhap = @id
        `);

        // Nếu có cập nhật chi tiết sản phẩm
        if (chiTiet && Array.isArray(chiTiet)) {
            // Lấy chi tiết cũ để hoàn lại tồn kho
            const oldReq = new sql.Request();
            oldReq.input('id', sql.Int, id);
            const oldDetail = await oldReq.query(`
                SELECT maSanPham, soLuong FROM ChiTietPhieuNhap WHERE maPhieuNhap = @id
            `);

            // Hoàn lại tồn kho cũ
            for (const old of oldDetail.recordset) {
                const rollbackReq = new sql.Request();
                rollbackReq.input('maSanPham', sql.NVarChar(10), old.maSanPham);
                rollbackReq.input('soLuong',   sql.Int,          old.soLuong);
                await rollbackReq.query(`
                    UPDATE ChiTietSanPham
                    SET soLuongTon = soLuongTon - @soLuong
                    WHERE maSanPham = @maSanPham
                `);
            }

            // Xóa chi tiết cũ
            const delReq = new sql.Request();
            delReq.input('id', sql.Int, id);
            await delReq.query(`DELETE FROM ChiTietPhieuNhap WHERE maPhieuNhap = @id`);

            // Thêm chi tiết mới và cập nhật tồn kho
            let tongTien = 0;
            for (const item of chiTiet) {
                if (!item.maSanPham || !item.soLuong || !item.giaNhap) continue;

                const detailReq = new sql.Request();
                detailReq.input('maPhieuNhap', sql.Int,           id);
                detailReq.input('maSanPham',   sql.NVarChar(10),  item.maSanPham);
                detailReq.input('soLuong',     sql.Int,           parseInt(item.soLuong));
                detailReq.input('giaNhap',     sql.Decimal(10,2), parseFloat(item.giaNhap));

                await detailReq.query(`
                    INSERT INTO ChiTietPhieuNhap (maPhieuNhap, maSanPham, soLuong, giaNhap)
                    VALUES (@maPhieuNhap, @maSanPham, @soLuong, @giaNhap)
                `);

                // Cộng tồn kho mới
                const stockReq = new sql.Request();
                stockReq.input('maSanPham', sql.NVarChar(10), item.maSanPham);
                stockReq.input('soLuong',   sql.Int,          parseInt(item.soLuong));
                await stockReq.query(`
                    UPDATE ChiTietSanPham
                    SET soLuongTon = soLuongTon + @soLuong
                    WHERE maSanPham = @maSanPham
                `);

                tongTien += parseInt(item.soLuong) * parseFloat(item.giaNhap);
            }

            // Cập nhật tổng tiền
            const updateReq = new sql.Request();
            updateReq.input('id',       sql.Int,           id);
            updateReq.input('tongTien', sql.Decimal(10,2), tongTien);
            await updateReq.query(`
                UPDATE PhieuNhap SET tongTien = @tongTien WHERE maPhieuNhap = @id
            `);
        }

        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (err) {
        console.error('PUT /receipts/:id error:', err);
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
