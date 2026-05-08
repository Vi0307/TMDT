/**
 * user/orders.user.js
 * API đơn hàng cho người dùng (yêu cầu đăng nhập)
 *
 * Routes:
 *   POST /api/orders                  - Đặt hàng
 *   GET  /api/orders/my-orders        - Danh sách đơn hàng của tôi
 *   GET  /api/orders/:id              - Chi tiết đơn hàng
 *   PUT  /api/orders/:id/cancel       - Hủy đơn hàng
 *
 * Ví dụ POST /api/orders:
 * {
 *   "diaChiGiaoHang": "123 Lê Lợi, HCM",
 *   "loaiDiaChi": "Nhà",
 *   "maPTTT": 2,          // 1=MOMO, 2=COD
 *   "maPTVC": 1,          // 1=Nhanh, 2=Hỏa tốc
 *   "items": [            // Nếu không truyền → lấy từ giỏ hàng
 *     { "maSanPham": 1, "soLuong": 2 }
 *   ]
 * }
 */

const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

// ─────────────────────────────────────────────
// POST /api/orders — Đặt hàng
// ─────────────────────────────────────────────
router.post('/', async (req, res) => {
    const {
        diaChiGiaoHang,
        loaiDiaChi,
        maPTTT,
        maPTVC,
        items   // optional: nếu không có → lấy từ giỏ hàng
    } = req.body;

    if (!diaChiGiaoHang || !maPTTT || !maPTVC) {
        return res.status(400).json({
            success: false,
            message: 'Thiếu thông tin: diaChiGiaoHang, maPTTT, maPTVC'
        });
    }

    try {
        // Lấy thông tin phương thức vận chuyển (snapshot giá + số ngày)
        const ptvcReq = new sql.Request();
        ptvcReq.input('maPTVC', sql.Int, maPTVC);
        const ptvcResult = await ptvcReq.query(
            'SELECT phiVanChuyen, soNgayDuKien FROM PhuongThucVanChuyen WHERE maPTVC = @maPTVC'
        );
        if (ptvcResult.recordset.length === 0) {
            return res.status(400).json({ success: false, message: 'Phương thức vận chuyển không hợp lệ.' });
        }
        const { phiVanChuyen, soNgayDuKien } = ptvcResult.recordset[0];

        // Xác định danh sách sản phẩm đặt hàng
        let orderItems = [];

        if (items && Array.isArray(items) && items.length > 0) {
            // Dùng items từ request body
            orderItems = items;
        } else {
            // Lấy từ giỏ hàng
            const cartReq = new sql.Request();
            cartReq.input('maNguoiDung', sql.Int, req.user.id);
            const cartResult = await cartReq.query(`
                SELECT ctgh.maSanPham, ctgh.soLuong
                FROM ChiTietGioHang ctgh
                INNER JOIN GioHang gh ON ctgh.maGioHang = gh.maGioHang
                WHERE gh.maNguoiDung = @maNguoiDung
            `);
            if (cartResult.recordset.length === 0) {
                return res.status(400).json({ success: false, message: 'Giỏ hàng trống.' });
            }
            orderItems = cartResult.recordset;
        }

        // Kiểm tra tồn kho và tính tổng tiền hàng
        let tongTienHang = 0;
        const validatedItems = [];

        for (const item of orderItems) {
            const spReq = new sql.Request();
            spReq.input('maSanPham', sql.NVarChar(10), item.maSanPham);
            const spResult = await spReq.query(`
                SELECT sp.maSanPham, sp.tenSanPham, sp.gia,
                       ISNULL(ct.soLuongTon, 0) AS soLuongTon
                FROM SanPham sp
                LEFT JOIN ChiTietSanPham ct ON sp.maSanPham = ct.maSanPham
                WHERE sp.maSanPham = @maSanPham AND sp.trangThai = N'Đang bán'
            `);

            if (spResult.recordset.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: `Sản phẩm ID ${item.maSanPham} không tồn tại hoặc ngừng bán.`
                });
            }

            const sp = spResult.recordset[0];
            if (sp.soLuongTon < item.soLuong) {
                return res.status(400).json({
                    success: false,
                    message: `"${sp.tenSanPham}" không đủ hàng. Tồn kho: ${sp.soLuongTon}`
                });
            }

            tongTienHang += parseFloat(sp.gia) * parseInt(item.soLuong);
            validatedItems.push({ ...item, gia: sp.gia, tenSanPham: sp.tenSanPham });
        }

        const tongTien = tongTienHang + parseFloat(phiVanChuyen);

        // Lấy maTrangThai "Chờ xác nhận" (ORDER)
        const ttReq = new sql.Request();
        const ttResult = await ttReq.query(
            `SELECT maTrangThai FROM TrangThai WHERE tenTrangThai = N'Chờ xác nhận' AND loai = 'ORDER'`
        );
        const maTrangThai = ttResult.recordset[0].maTrangThai;

        // Tạo đơn hàng
        const orderReq = new sql.Request();
        orderReq.input('maNguoiDung',    sql.Int,          req.user.id);
        orderReq.input('phiVanChuyen',   sql.Decimal(10,2), phiVanChuyen);
        orderReq.input('soNgayDuKien',   sql.Int,          soNgayDuKien);
        orderReq.input('tongTien',       sql.Decimal(10,2), tongTien);
        orderReq.input('maTrangThai',    sql.Int,          maTrangThai);
        orderReq.input('maPTTT',         sql.Int,          maPTTT);
        orderReq.input('maPTVC',         sql.Int,          maPTVC);
        orderReq.input('diaChiGiaoHang', sql.NVarChar,     diaChiGiaoHang);
        orderReq.input('loaiDiaChi',     sql.NVarChar,     loaiDiaChi || null);

        const orderResult = await orderReq.query(`
            INSERT INTO DonHang
                (maNguoiDung, phiVanChuyen, soNgayDuKien, tongTien,
                 maTrangThai, maPTTT, maPTVC, diaChiGiaoHang, loaiDiaChi)
            OUTPUT INSERTED.maDonHang
            VALUES
                (@maNguoiDung, @phiVanChuyen, @soNgayDuKien, @tongTien,
                 @maTrangThai, @maPTTT, @maPTVC, @diaChiGiaoHang, @loaiDiaChi)
        `);
        const maDonHang = orderResult.recordset[0].maDonHang;

        // Thêm chi tiết đơn hàng + trừ tồn kho
        for (const item of validatedItems) {
            const detailReq = new sql.Request();
            detailReq.input('maDonHang', sql.Int,           maDonHang);
            detailReq.input('maSanPham', sql.NVarChar(10),  item.maSanPham);
            detailReq.input('soLuong',   sql.Int,          item.soLuong);
            detailReq.input('gia',       sql.Decimal(10,2), item.gia);
            await detailReq.query(`
                INSERT INTO ChiTietDonHang (maDonHang, maSanPham, soLuong, gia)
                VALUES (@maDonHang, @maSanPham, @soLuong, @gia)
            `);

            // Trừ tồn kho
            const stockReq = new sql.Request();
            stockReq.input('maSanPham', sql.NVarChar(10), item.maSanPham);
            stockReq.input('soLuong',   sql.Int, item.soLuong);
            await stockReq.query(`
                UPDATE ChiTietSanPham
                SET soLuongTon = soLuongTon - @soLuong
                WHERE maSanPham = @maSanPham
            `);
        }

        // Tạo giao dịch thanh toán (trạng thái "Chờ thanh toán")
        const gdTTReq = new sql.Request();
        const gdTTResult = await gdTTReq.query(
            `SELECT maTrangThai FROM TrangThai WHERE tenTrangThai = N'Chờ thanh toán' AND loai = 'PAYMENT'`
        );
        const maTTPayment = gdTTResult.recordset[0].maTrangThai;

        const gdReq = new sql.Request();
        gdReq.input('maDonHang',    sql.Int,          maDonHang);
        gdReq.input('soTien',       sql.Decimal(10,2), tongTien);
        gdReq.input('maTrangThai',  sql.Int,          maTTPayment);
        gdReq.input('loaiGiaoDich', sql.NVarChar,     'PAYMENT');
        await gdReq.query(`
            INSERT INTO GiaoDich (loaiGiaoDich, maTrangThai, soTien, maDonHang)
            VALUES (@loaiGiaoDich, @maTrangThai, @soTien, @maDonHang)
        `);

        // Xóa giỏ hàng nếu đặt từ giỏ (không truyền items)
        if (!items || !Array.isArray(items) || items.length === 0) {
            const clearReq = new sql.Request();
            clearReq.input('maNguoiDung', sql.Int, req.user.id);
            await clearReq.query(`
                DELETE FROM ChiTietGioHang
                WHERE maGioHang = (SELECT maGioHang FROM GioHang WHERE maNguoiDung = @maNguoiDung)
            `);
        }

        return res.status(201).json({
            success: true,
            message: 'Đặt hàng thành công!',
            data: {
                maDonHang,
                tongTien,
                phiVanChuyen,
                soLuongSanPham: validatedItems.length
            }
        });
    } catch (err) {
        console.error('POST /orders error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────────
// GET /api/orders/my-orders
// Query: status (processing|delivering|delivered|cancelled), page, limit
// ─────────────────────────────────────────────
router.get('/my-orders', async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const request = new sql.Request();
        request.input('maNguoiDung', sql.Int, req.user.id);
        request.input('offset',      sql.Int, offset);
        request.input('limit',       sql.Int, parseInt(limit));

        let where = `WHERE dh.maNguoiDung = @maNguoiDung AND tt.loai = 'ORDER'`;

        // Map status key → tên tiếng Việt
        const STATUS_MAP = {
            processing: 'Chờ xác nhận',
            delivering: 'Đang giao',
            delivered:  'Đã giao',
            cancelled:  'Đã hủy'
        };
        if (status && STATUS_MAP[status]) {
            where += ` AND tt.tenTrangThai = @tenTrangThai`;
            request.input('tenTrangThai', sql.NVarChar, STATUS_MAP[status]);
        }

        const countResult = await request.query(`
            SELECT COUNT(*) AS total
            FROM DonHang dh
            INNER JOIN TrangThai tt ON dh.maTrangThai = tt.maTrangThai
            ${where}
        `);
        const total = countResult.recordset[0].total;

        const result = await request.query(`
            SELECT
                dh.maDonHang,
                dh.tongTien,
                dh.phiVanChuyen,
                dh.ngayDat,
                dh.ngayDuKienGiao,
                dh.diaChiGiaoHang,
                tt.tenTrangThai,
                pttt.phuongThuc AS phuongThucThanhToan,
                ptvc.tenPTVC    AS phuongThucVanChuyen,
                COUNT(ctdh.maSanPham) AS soLuongSanPham
            FROM DonHang dh
            INNER JOIN TrangThai tt ON dh.maTrangThai = tt.maTrangThai
            LEFT JOIN PhuongThucThanhToan pttt ON dh.maPTTT = pttt.maPTTT
            LEFT JOIN PhuongThucVanChuyen ptvc ON dh.maPTVC = ptvc.maPTVC
            LEFT JOIN ChiTietDonHang ctdh ON dh.maDonHang = ctdh.maDonHang
            ${where}
            GROUP BY
                dh.maDonHang, dh.tongTien, dh.phiVanChuyen, dh.ngayDat,
                dh.ngayDuKienGiao, dh.diaChiGiaoHang, tt.tenTrangThai,
                pttt.phuongThuc, ptvc.tenPTVC
            ORDER BY dh.maDonHang DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);

        return res.json({
            success: true,
            data: result.recordset,
            pagination: {
                total,
                page:       parseInt(page),
                limit:      parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error('GET /orders/my-orders error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────────
// GET /api/orders/:id — Chi tiết đơn hàng
// ─────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const request = new sql.Request();
        request.input('maDonHang',   sql.Int, req.params.id);
        request.input('maNguoiDung', sql.Int, req.user.id);

        // Thông tin đơn hàng (chỉ của user hiện tại)
        const orderResult = await request.query(`
            SELECT
                dh.maDonHang,
                dh.tongTien,
                dh.phiVanChuyen,
                dh.soNgayDuKien,
                dh.ngayDat,
                dh.ngayXacNhan,
                dh.ngayDuKienGiao,
                dh.ngayGiaoHang,
                dh.ngayHoanThanh,
                dh.ngayHuy,
                dh.lyDoHuy,
                dh.diaChiGiaoHang,
                dh.loaiDiaChi,
                tt.tenTrangThai,
                pttt.phuongThuc AS phuongThucThanhToan,
                ptvc.tenPTVC    AS phuongThucVanChuyen,
                ptvc.phiVanChuyen AS phiVanChuyenHienTai
            FROM DonHang dh
            INNER JOIN TrangThai tt ON dh.maTrangThai = tt.maTrangThai
            LEFT JOIN PhuongThucThanhToan pttt ON dh.maPTTT = pttt.maPTTT
            LEFT JOIN PhuongThucVanChuyen ptvc ON dh.maPTVC = ptvc.maPTVC
            WHERE dh.maDonHang = @maDonHang AND dh.maNguoiDung = @maNguoiDung
        `);

        if (orderResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
        }

        // Chi tiết sản phẩm trong đơn
        const detailReq = new sql.Request();
        detailReq.input('maDonHang', sql.Int, req.params.id);
        const detailResult = await detailReq.query(`
            SELECT
                ctdh.maSanPham,
                sp.tenSanPham,
                sp.hinhAnh,
                ctdh.soLuong,
                ctdh.gia,
                (ctdh.soLuong * ctdh.gia) AS thanhTien
            FROM ChiTietDonHang ctdh
            INNER JOIN SanPham sp ON ctdh.maSanPham = sp.maSanPham
            WHERE ctdh.maDonHang = @maDonHang
        `);

        return res.json({
            success: true,
            data: {
                ...orderResult.recordset[0],
                chiTiet: detailResult.recordset
            }
        });
    } catch (err) {
        console.error('GET /orders/:id error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────────
// PUT /api/orders/:id/cancel — Hủy đơn hàng
// Body: { lyDoHuy? }
// Chỉ hủy được khi đơn đang "Chờ xác nhận"
// ─────────────────────────────────────────────
router.put('/:id/cancel', async (req, res) => {
    const { lyDoHuy } = req.body;

    try {
        const request = new sql.Request();
        request.input('maDonHang',   sql.Int, req.params.id);
        request.input('maNguoiDung', sql.Int, req.user.id);

        // Kiểm tra đơn hàng và trạng thái hiện tại
        const orderResult = await request.query(`
            SELECT dh.maDonHang, tt.tenTrangThai
            FROM DonHang dh
            INNER JOIN TrangThai tt ON dh.maTrangThai = tt.maTrangThai
            WHERE dh.maDonHang = @maDonHang AND dh.maNguoiDung = @maNguoiDung
        `);

        if (orderResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
        }

        const { tenTrangThai } = orderResult.recordset[0];
        if (tenTrangThai !== 'Chờ xác nhận') {
            return res.status(400).json({
                success: false,
                message: `Không thể hủy đơn hàng ở trạng thái "${tenTrangThai}". Chỉ hủy được khi đang "Chờ xác nhận".`
            });
        }

        // Cập nhật trạng thái → "Đã hủy"
        const cancelReq = new sql.Request();
        cancelReq.input('maDonHang', sql.Int,     req.params.id);
        cancelReq.input('lyDoHuy',   sql.NVarChar, lyDoHuy || 'Khách hàng hủy đơn');
        await cancelReq.query(`
            UPDATE DonHang
            SET maTrangThai = (
                    SELECT maTrangThai FROM TrangThai
                    WHERE tenTrangThai = N'Đã hủy' AND loai = 'ORDER'
                ),
                ngayHuy  = GETDATE(),
                lyDoHuy  = @lyDoHuy
            WHERE maDonHang = @maDonHang
        `);

        // Hoàn lại tồn kho
        const itemsReq = new sql.Request();
        itemsReq.input('maDonHang', sql.Int, req.params.id);
        const items = await itemsReq.query(
            'SELECT maSanPham, soLuong FROM ChiTietDonHang WHERE maDonHang = @maDonHang'
        );
        for (const item of items.recordset) {
            const restoreReq = new sql.Request();
            restoreReq.input('maSanPham', sql.NVarChar(10), item.maSanPham);
            restoreReq.input('soLuong',   sql.Int, item.soLuong);
            await restoreReq.query(`
                UPDATE ChiTietSanPham
                SET soLuongTon = soLuongTon + @soLuong
                WHERE maSanPham = @maSanPham
            `);
        }

        return res.json({ success: true, message: 'Đã hủy đơn hàng thành công.' });
    } catch (err) {
        console.error('PUT /orders/:id/cancel error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
