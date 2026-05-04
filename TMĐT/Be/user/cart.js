/**
 * user/cart.js
 * API giỏ hàng (yêu cầu đăng nhập)
 *
 * Routes:
 *   GET    /api/cart          - Xem giỏ hàng
 *   POST   /api/cart          - Thêm sản phẩm vào giỏ
 *   PUT    /api/cart/:id      - Cập nhật số lượng item (maCTGH)
 *   DELETE /api/cart/:id      - Xóa item khỏi giỏ (maCTGH)
 *   DELETE /api/cart          - Xóa toàn bộ giỏ hàng
 *
 * Ví dụ request:
 *   POST /api/cart
 *   Body: { maSanPham: 1, soLuong: 2 }
 *
 *   PUT /api/cart/5
 *   Body: { soLuong: 3 }
 */

const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');
const { authMiddleware } = require('../middleware/authMiddleware');

// Tất cả route giỏ hàng đều cần đăng nhập
router.use(authMiddleware);

// ─────────────────────────────────────────────
// Hàm helper: lấy hoặc tạo giỏ hàng cho user
// ─────────────────────────────────────────────
async function getOrCreateCart(maNguoiDung) {
    const req1 = new sql.Request();
    req1.input('maNguoiDung', sql.Int, maNguoiDung);
    const existing = await req1.query(
        'SELECT maGioHang FROM GioHang WHERE maNguoiDung = @maNguoiDung'
    );
    if (existing.recordset.length > 0) {
        return existing.recordset[0].maGioHang;
    }
    // Tạo mới nếu chưa có
    const req2 = new sql.Request();
    req2.input('maNguoiDung', sql.Int, maNguoiDung);
    const created = await req2.query(`
        INSERT INTO GioHang (maNguoiDung)
        OUTPUT INSERTED.maGioHang
        VALUES (@maNguoiDung)
    `);
    return created.recordset[0].maGioHang;
}

// ─────────────────────────────────────────────
// GET /api/cart
// Response: { success, data: { maGioHang, items: [...], tongTien } }
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const maGioHang = await getOrCreateCart(req.user.id);

        const request = new sql.Request();
        request.input('maGioHang', sql.Int, maGioHang);

        const result = await request.query(`
            SELECT
                ctgh.maCTGH,
                ctgh.maSanPham,
                sp.tenSanPham,
                sp.gia,
                sp.hinhAnh,
                ctgh.soLuong,
                (sp.gia * ctgh.soLuong) AS thanhTien,
                ISNULL(ct.soLuongTon, 0) AS soLuongTon
            FROM ChiTietGioHang ctgh
            INNER JOIN SanPham sp ON ctgh.maSanPham = sp.maSanPham
            LEFT JOIN ChiTietSanPham ct ON sp.maSanPham = ct.maSanPham
            WHERE ctgh.maGioHang = @maGioHang
            ORDER BY ctgh.maCTGH ASC
        `);

        const items = result.recordset;
        const tongTien = items.reduce((sum, item) => sum + parseFloat(item.thanhTien), 0);

        return res.json({
            success: true,
            data: { maGioHang, items, tongTien }
        });
    } catch (err) {
        console.error('GET /cart error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────────
// POST /api/cart
// Body: { maSanPham, soLuong }
// Nếu sản phẩm đã có trong giỏ → cộng thêm số lượng
// ─────────────────────────────────────────────
router.post('/', async (req, res) => {
    const { maSanPham, soLuong = 1 } = req.body;

    if (!maSanPham) {
        return res.status(400).json({ success: false, message: 'Thiếu maSanPham.' });
    }
    if (parseInt(soLuong) < 1) {
        return res.status(400).json({ success: false, message: 'soLuong phải >= 1.' });
    }

    try {
        // Kiểm tra sản phẩm tồn tại và còn hàng
        const spReq = new sql.Request();
        spReq.input('maSanPham', sql.Int, maSanPham);
        const spResult = await spReq.query(`
            SELECT sp.maSanPham, sp.tenSanPham, ISNULL(ct.soLuongTon, 0) AS soLuongTon
            FROM SanPham sp
            LEFT JOIN ChiTietSanPham ct ON sp.maSanPham = ct.maSanPham
            WHERE sp.maSanPham = @maSanPham AND sp.trangThai = N'Đang bán'
        `);
        if (spResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại hoặc ngừng bán.' });
        }
        const sp = spResult.recordset[0];
        if (sp.soLuongTon < parseInt(soLuong)) {
            return res.status(400).json({
                success: false,
                message: `Không đủ hàng. Tồn kho: ${sp.soLuongTon}`
            });
        }

        const maGioHang = await getOrCreateCart(req.user.id);

        // Kiểm tra sản phẩm đã có trong giỏ chưa
        const checkReq = new sql.Request();
        checkReq.input('maGioHang', sql.Int, maGioHang);
        checkReq.input('maSanPham', sql.Int, maSanPham);
        const existing = await checkReq.query(`
            SELECT maCTGH, soLuong FROM ChiTietGioHang
            WHERE maGioHang = @maGioHang AND maSanPham = @maSanPham
        `);

        if (existing.recordset.length > 0) {
            // Cộng thêm số lượng
            const newQty = existing.recordset[0].soLuong + parseInt(soLuong);
            if (newQty > sp.soLuongTon) {
                return res.status(400).json({
                    success: false,
                    message: `Không đủ hàng. Tồn kho: ${sp.soLuongTon}, hiện có trong giỏ: ${existing.recordset[0].soLuong}`
                });
            }
            const updateReq = new sql.Request();
            updateReq.input('maCTGH',  sql.Int, existing.recordset[0].maCTGH);
            updateReq.input('soLuong', sql.Int, newQty);
            await updateReq.query(
                'UPDATE ChiTietGioHang SET soLuong = @soLuong WHERE maCTGH = @maCTGH'
            );
        } else {
            // Thêm mới
            const insertReq = new sql.Request();
            insertReq.input('maGioHang', sql.Int, maGioHang);
            insertReq.input('maSanPham', sql.Int, maSanPham);
            insertReq.input('soLuong',   sql.Int, parseInt(soLuong));
            await insertReq.query(`
                INSERT INTO ChiTietGioHang (maGioHang, maSanPham, soLuong)
                VALUES (@maGioHang, @maSanPham, @soLuong)
            `);
        }

        return res.status(201).json({
            success: true,
            message: `Đã thêm "${sp.tenSanPham}" vào giỏ hàng.`
        });
    } catch (err) {
        console.error('POST /cart error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────────
// PUT /api/cart/:id  (id = maCTGH)
// Body: { soLuong }
// ─────────────────────────────────────────────
router.put('/:id', async (req, res) => {
    const { soLuong } = req.body;

    if (!soLuong || parseInt(soLuong) < 1) {
        return res.status(400).json({ success: false, message: 'soLuong phải >= 1.' });
    }

    try {
        const maGioHang = await getOrCreateCart(req.user.id);

        // Kiểm tra item thuộc giỏ của user
        const checkReq = new sql.Request();
        checkReq.input('maCTGH',   sql.Int, req.params.id);
        checkReq.input('maGioHang', sql.Int, maGioHang);
        const item = await checkReq.query(`
            SELECT ctgh.maCTGH, ctgh.maSanPham, ISNULL(ct.soLuongTon, 0) AS soLuongTon
            FROM ChiTietGioHang ctgh
            LEFT JOIN ChiTietSanPham ct ON ctgh.maSanPham = ct.maSanPham
            WHERE ctgh.maCTGH = @maCTGH AND ctgh.maGioHang = @maGioHang
        `);

        if (item.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy item trong giỏ hàng.' });
        }

        if (parseInt(soLuong) > item.recordset[0].soLuongTon) {
            return res.status(400).json({
                success: false,
                message: `Không đủ hàng. Tồn kho: ${item.recordset[0].soLuongTon}`
            });
        }

        const updateReq = new sql.Request();
        updateReq.input('maCTGH',  sql.Int, req.params.id);
        updateReq.input('soLuong', sql.Int, parseInt(soLuong));
        await updateReq.query(
            'UPDATE ChiTietGioHang SET soLuong = @soLuong WHERE maCTGH = @maCTGH'
        );

        return res.json({ success: true, message: 'Đã cập nhật số lượng.' });
    } catch (err) {
        console.error('PUT /cart/:id error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────────
// DELETE /api/cart/:id  (id = maCTGH)
// ─────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        const maGioHang = await getOrCreateCart(req.user.id);

        const request = new sql.Request();
        request.input('maCTGH',    sql.Int, req.params.id);
        request.input('maGioHang', sql.Int, maGioHang);

        const result = await request.query(`
            DELETE FROM ChiTietGioHang
            WHERE maCTGH = @maCTGH AND maGioHang = @maGioHang
        `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy item trong giỏ hàng.' });
        }

        return res.json({ success: true, message: 'Đã xóa sản phẩm khỏi giỏ hàng.' });
    } catch (err) {
        console.error('DELETE /cart/:id error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────────
// DELETE /api/cart  — Xóa toàn bộ giỏ hàng
// ─────────────────────────────────────────────
router.delete('/', async (req, res) => {
    try {
        const maGioHang = await getOrCreateCart(req.user.id);

        const request = new sql.Request();
        request.input('maGioHang', sql.Int, maGioHang);
        await request.query(
            'DELETE FROM ChiTietGioHang WHERE maGioHang = @maGioHang'
        );

        return res.json({ success: true, message: 'Đã xóa toàn bộ giỏ hàng.' });
    } catch (err) {
        console.error('DELETE /cart error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
