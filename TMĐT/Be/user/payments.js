/**
 * user/payments.js
 * API thanh toán (yêu cầu đăng nhập)
 *
 * Routes:
 *   POST /api/payments/cod     - Thanh toán COD (xác nhận đơn COD)
 *   POST /api/payments/online  - Thanh toán online (mock MOMO)
 *
 * Ví dụ:
 *   POST /api/payments/cod
 *   Body: { maDonHang: 1 }
 *
 *   POST /api/payments/online
 *   Body: { maDonHang: 1, momoCode: "MOMO_TXN_123" }
 */

const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

// ─────────────────────────────────────────────
// Helper: lấy thông tin đơn hàng + kiểm tra quyền
// ─────────────────────────────────────────────
async function getOrderForPayment(maDonHang, maNguoiDung) {
    const request = new sql.Request();
    request.input('maDonHang',   sql.Int, maDonHang);
    request.input('maNguoiDung', sql.Int, maNguoiDung);

    const result = await request.query(`
        SELECT
            dh.maDonHang,
            dh.tongTien,
            dh.maPTTT,
            pttt.phuongThuc,
            tt.tenTrangThai AS trangThaiDon,
            gd.maGiaoDich,
            gd.maTrangThai  AS maTrangThaiGD,
            ttgd.tenTrangThai AS trangThaiGD
        FROM DonHang dh
        INNER JOIN TrangThai tt   ON dh.maTrangThai = tt.maTrangThai
        LEFT JOIN PhuongThucThanhToan pttt ON dh.maPTTT = pttt.maPTTT
        LEFT JOIN GiaoDich gd     ON dh.maDonHang = gd.maDonHang AND gd.loaiGiaoDich = 'PAYMENT'
        LEFT JOIN TrangThai ttgd  ON gd.maTrangThai = ttgd.maTrangThai
        WHERE dh.maDonHang = @maDonHang AND dh.maNguoiDung = @maNguoiDung
    `);

    return result.recordset[0] || null;
}

// ─────────────────────────────────────────────
// POST /api/payments/cod
// Xác nhận thanh toán COD — đánh dấu giao dịch "Thành công"
// (thực tế COD thanh toán khi nhận hàng, đây là bước xác nhận phương thức)
// ─────────────────────────────────────────────
router.post('/cod', async (req, res) => {
    const { maDonHang } = req.body;

    if (!maDonHang) {
        return res.status(400).json({ success: false, message: 'Thiếu maDonHang.' });
    }

    try {
        const order = await getOrderForPayment(maDonHang, req.user.id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
        }
        if (order.phuongThuc !== 'COD') {
            return res.status(400).json({
                success: false,
                message: `Đơn hàng này dùng phương thức "${order.phuongThuc}", không phải COD.`
            });
        }
        if (order.trangThaiGD === 'Thành công') {
            return res.status(400).json({ success: false, message: 'Đơn hàng đã được thanh toán.' });
        }
        if (order.trangThaiDon === 'Đã hủy') {
            return res.status(400).json({ success: false, message: 'Đơn hàng đã bị hủy.' });
        }

        // Cập nhật giao dịch → "Thành công"
        const updateReq = new sql.Request();
        updateReq.input('maGiaoDich', sql.Int, order.maGiaoDich);
        await updateReq.query(`
            UPDATE GiaoDich
            SET maTrangThai = (
                SELECT maTrangThai FROM TrangThai
                WHERE tenTrangThai = N'Thành công' AND loai = 'PAYMENT'
            )
            WHERE maGiaoDich = @maGiaoDich
        `);

        return res.json({
            success: true,
            message: 'Xác nhận thanh toán COD thành công. Bạn sẽ thanh toán khi nhận hàng.',
            data: {
                maDonHang,
                soTien:       order.tongTien,
                phuongThuc:   'COD',
                trangThai:    'Thành công'
            }
        });
    } catch (err) {
        console.error('POST /payments/cod error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────────
// POST /api/payments/online
// Thanh toán online (mock MOMO)
// Body: { maDonHang, momoCode }
// momoCode: mã giao dịch từ cổng thanh toán (mock)
// ─────────────────────────────────────────────
router.post('/online', async (req, res) => {
    const { maDonHang, momoCode } = req.body;

    if (!maDonHang) {
        return res.status(400).json({ success: false, message: 'Thiếu maDonHang.' });
    }

    try {
        const order = await getOrderForPayment(maDonHang, req.user.id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
        }
        if (order.trangThaiGD === 'Thành công') {
            return res.status(400).json({ success: false, message: 'Đơn hàng đã được thanh toán.' });
        }
        if (order.trangThaiDon === 'Đã hủy') {
            return res.status(400).json({ success: false, message: 'Đơn hàng đã bị hủy.' });
        }

        // ── KIỂM TRA & TRỪ SỐ DƯ VÍ ĐIỆN TỬ MOMO ──
        const walletReq = new sql.Request();
        walletReq.input('maNguoiDung', sql.Int, req.user.id);
        const walletResult = await walletReq.query(`
            SELECT soDu, trangThai FROM ViDienTu WHERE maNguoiDung = @maNguoiDung
        `);

        if (walletResult.recordset.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tài khoản của bạn chưa được liên kết ví điện tử MoMo.'
            });
        }

        const { soDu, trangThai: trangThaiVi } = walletResult.recordset[0];
        if (trangThaiVi === 'Bị khóa') {
            return res.status(400).json({
                success: false,
                message: 'Ví điện tử MoMo của bạn hiện đang bị khóa.'
            });
        }

        const tongTien = parseFloat(order.tongTien);
        if (parseFloat(soDu) < tongTien) {
            return res.status(400).json({
                success: false,
                message: `Số dư ví điện tử MoMo không đủ để thanh toán (Hiện có: ${Number(soDu).toLocaleString('vi-VN')} VNĐ, Cần thanh toán: ${Number(tongTien).toLocaleString('vi-VN')} VNĐ). Vui lòng chọn phương thức thanh toán khác.`
            });
        }

        // Trừ tiền trong ví điện tử
        const deductReq = new sql.Request();
        deductReq.input('maNguoiDung', sql.Int, req.user.id);
        deductReq.input('tongTien', sql.Decimal(10,2), tongTien);
        await deductReq.query(`
            UPDATE ViDienTu
            SET soDu = soDu - @tongTien
            WHERE maNguoiDung = @maNguoiDung
        `);

        // Cập nhật giao dịch → "Thành công" + lưu momoCode
        const updateReq = new sql.Request();
        updateReq.input('maGiaoDich', sql.Int,     order.maGiaoDich);
        updateReq.input('momoCode',   sql.NVarChar, momoCode || `MOCK_${Date.now()}`);
        await updateReq.query(`
            UPDATE GiaoDich
            SET maTrangThai = (
                    SELECT maTrangThai FROM TrangThai
                    WHERE tenTrangThai = N'Thành công' AND loai = 'PAYMENT'
                ),
                momoCode = @momoCode
            WHERE maGiaoDich = @maGiaoDich
        `);

        return res.json({
            success: true,
            message: 'Thanh toán qua ví điện tử MoMo thành công!',
            data: {
                maDonHang,
                soTien:     order.tongTien,
                phuongThuc: order.phuongThuc,
                momoCode:   momoCode || `MOCK_${Date.now()}`,
                trangThai:  'Thành công'
            }
        });
    } catch (err) {
        console.error('POST /payments/online error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
