/**
 * user/auth.js
 * API xác thực người dùng (đăng ký / đăng nhập)
 *
 * Routes:
 *   POST /api/auth/register  - Đăng ký tài khoản mới
 *   POST /api/auth/login     - Đăng nhập
 *
 * Lưu ý: File này KHÔNG thay thế authController.js hiện có.
 * app.js đã mount /api/auth → routes/authRoutes.js.
 * Nếu muốn dùng file này, mount thêm hoặc thay thế trong app.js.
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql } = require('../config/db');

// ─────────────────────────────────────────────
// POST /api/auth/register
// Body: { ten, email, matKhau, soDienThoai?, diaChi? }
// Response: { success, message, token, user }
// ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
    const { ten, email, matKhau, soDienThoai, diaChi } = req.body;

    // Validate bắt buộc
    if (!ten || !email || !matKhau) {
        return res.status(400).json({
            success: false,
            message: 'Vui lòng cung cấp đầy đủ: ten, email, matKhau'
        });
    }

    try {
        // Kiểm tra email đã tồn tại chưa
        const checkReq = new sql.Request();
        checkReq.input('email', sql.NVarChar, email);
        const existing = await checkReq.query(
            'SELECT maNguoiDung FROM NguoiDung WHERE email = @email'
        );
        if (existing.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Email đã được sử dụng.'
            });
        }

        // Hash mật khẩu
        const hashedPwd = await bcrypt.hash(matKhau, 10);

        // Thêm người dùng
        const insertReq = new sql.Request();
        insertReq.input('ten',          sql.NVarChar, ten);
        insertReq.input('email',        sql.NVarChar, email);
        insertReq.input('matKhau',      sql.NVarChar, hashedPwd);
        insertReq.input('soDienThoai',  sql.NVarChar, soDienThoai || null);
        insertReq.input('diaChi',       sql.NVarChar, diaChi || null);

        const insertResult = await insertReq.query(`
            INSERT INTO NguoiDung (ten, email, matKhau, soDienThoai, diaChi, vaiTro, trangThai)
            OUTPUT INSERTED.maNguoiDung, INSERTED.vaiTro
            VALUES (@ten, @email, @matKhau, @soDienThoai, @diaChi, 'USER', N'Hoạt động')
        `);

        const newUser = insertResult.recordset[0];

        // Tạo ví điện tử cho user mới với số dư ngẫu nhiên để dễ test (từ 100k đến 1M)
        const randomSoDu = Math.floor(Math.random() * (1000 - 100 + 1) + 100) * 1000;
        const viReq = new sql.Request();
        viReq.input('maNguoiDung', sql.Int, newUser.maNguoiDung);
        viReq.input('soDu', sql.Decimal(10, 2), randomSoDu);
        await viReq.query(`
            INSERT INTO ViDienTu (maNguoiDung, soDu, trangThai)
            VALUES (@maNguoiDung, @soDu, N'Hoạt động')
        `);

        // Tạo giỏ hàng cho user mới
        const cartReq = new sql.Request();
        cartReq.input('maNguoiDung', sql.Int, newUser.maNguoiDung);
        await cartReq.query(`
            INSERT INTO GioHang (maNguoiDung) VALUES (@maNguoiDung)
        `);

        // Tạo JWT
        const token = jwt.sign(
            { id: newUser.maNguoiDung, role: newUser.vaiTro },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.status(201).json({
            success: true,
            message: 'Đăng ký thành công!',
            token,
            user: {
                id:    newUser.maNguoiDung,
                ten,
                email,
                role:  newUser.vaiTro
            }
        });
    } catch (err) {
        console.error('POST /auth/register error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// Body: { email, matKhau }
// Response: { success, message, token, user }
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
    const { email, matKhau } = req.body;

    if (!email || !matKhau) {
        return res.status(400).json({
            success: false,
            message: 'Vui lòng cung cấp email và matKhau'
        });
    }

    try {
        const request = new sql.Request();
        request.input('email', sql.NVarChar, email);
        const result = await request.query(
            'SELECT * FROM NguoiDung WHERE email = @email'
        );

        if (result.recordset.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không chính xác.'
            });
        }

        const user = result.recordset[0];

        // Kiểm tra tài khoản bị khóa
        if (user.trangThai === 'Bị khóa') {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ hỗ trợ.'
            });
        }

        // So sánh mật khẩu
        const isMatch = await bcrypt.compare(matKhau, user.matKhau);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không chính xác.'
            });
        }

        // Tạo JWT
        const token = jwt.sign(
            { id: user.maNguoiDung, role: user.vaiTro },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.json({
            success: true,
            message: 'Đăng nhập thành công!',
            token,
            user: {
                id:    user.maNguoiDung,
                ten:   user.ten,
                email: user.email,
                role:  user.vaiTro
            }
        });
    } catch (err) {
        console.error('POST /auth/login error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

module.exports = router;
