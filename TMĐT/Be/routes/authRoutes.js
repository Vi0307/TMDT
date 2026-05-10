const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { sql } = require('../config/db');

// Đăng ký: POST /api/auth/register
router.post('/register', register);

// Đăng nhập: POST /api/auth/login
router.post('/login', login);

// Lấy thông tin user hiện tại: GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const request = new sql.Request();
        request.input('id', sql.Int, req.user.id);
        const result = await request.query(`
            SELECT maNguoiDung, ten, email, soDienThoai, diaChi, vaiTro, trangThai, ngayTao
            FROM NguoiDung
            WHERE maNguoiDung = @id
        `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
        }

        const user = result.recordset[0];
        return res.json({
            success: true,
            data: {
                id:          user.maNguoiDung,
                ten:         user.ten,
                email:       user.email,
                soDienThoai: user.soDienThoai || '',
                diaChi:      user.diaChi || '',
                vaiTro:      user.vaiTro,
                trangThai:   user.trangThai,
                ngayTao:     user.ngayTao
            }
        });
    } catch (err) {
        console.error('GET /auth/me error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Cập nhật thông tin user: PUT /api/auth/me
// Body: { ten, soDienThoai, diaChi }
router.put('/me', authMiddleware, async (req, res) => {
    const { ten, soDienThoai, diaChi } = req.body;

    if (!ten || ten.trim() === '') {
        return res.status(400).json({ success: false, message: 'Họ tên không được để trống.' });
    }

    try {
        const request = new sql.Request();
        request.input('id',          sql.Int,      req.user.id);
        request.input('ten',         sql.NVarChar,  ten.trim());
        request.input('soDienThoai', sql.NVarChar,  soDienThoai || null);
        request.input('diaChi',      sql.NVarChar,  diaChi || null);

        await request.query(`
            UPDATE NguoiDung
            SET ten = @ten, soDienThoai = @soDienThoai, diaChi = @diaChi
            WHERE maNguoiDung = @id
        `);

        // Trả về thông tin mới nhất
        const getReq = new sql.Request();
        getReq.input('id', sql.Int, req.user.id);
        const result = await getReq.query(`
            SELECT maNguoiDung, ten, email, soDienThoai, diaChi, vaiTro
            FROM NguoiDung WHERE maNguoiDung = @id
        `);
        const user = result.recordset[0];

        return res.json({
            success: true,
            message: 'Cập nhật thông tin thành công!',
            data: {
                id:          user.maNguoiDung,
                ten:         user.ten,
                email:       user.email,
                soDienThoai: user.soDienThoai || '',
                diaChi:      user.diaChi || '',
                role:        user.vaiTro
            }
        });
    } catch (err) {
        console.error('PUT /auth/me error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
