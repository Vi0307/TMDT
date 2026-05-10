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

module.exports = router;
