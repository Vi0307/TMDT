const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { register, login } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { sql } = require('../config/db');
const { sendOTP } = require('../utils/mailer');

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
// Body: { ten, soDienThoai, diaChi, matKhau }
router.put('/me', authMiddleware, async (req, res) => {
    console.log('>>> RECEIVED PUT /me REQUEST <<<');
    const { ten, soDienThoai, diaChi, matKhau } = req.body;

    if (!ten || ten.trim() === '') {
        return res.status(400).json({ success: false, message: 'Họ tên không được để trống.' });
    }

    try {
        const request = new sql.Request();
        request.input('id',          sql.Int,      req.user.id);
        request.input('ten',         sql.NVarChar,  ten.trim());
        request.input('soDienThoai', sql.NVarChar,  soDienThoai || null);
        request.input('diaChi',      sql.NVarChar,  diaChi || null);

        let query = 'UPDATE NguoiDung SET ten = @ten, soDienThoai = @soDienThoai, diaChi = @diaChi';
        
        if (matKhau && matKhau.length >= 6) {
            request.input('matKhau', sql.NVarChar(255), matKhau);
            query += ', matKhau = @matKhau';
        }

        query += ' WHERE maNguoiDung = @id';
        await request.query(query);

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

// ─── Quên mật khẩu: POST /api/auth/forgot-password ──────────────────────────
// Body: { email }
// Tạo OTP 6 số, lưu vào bảng OTP, trả về OTP (mock — thực tế gửi email)
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email.' });
    }

    try {
        // Kiểm tra email tồn tại
        const checkReq = new sql.Request();
        checkReq.input('email', sql.NVarChar, email);
        const checkResult = await checkReq.query(
            `SELECT maNguoiDung FROM NguoiDung WHERE email = @email AND trangThai = N'Hoạt động'`
        );

        if (checkResult.recordset.length === 0) {
            // Trả thông báo chung để tránh lộ thông tin
            return res.json({
                success: true,
                message: 'Nếu email tồn tại, mã OTP đã được gửi.'
            });
        }

        const maNguoiDung = checkResult.recordset[0].maNguoiDung;

        // Vô hiệu hóa OTP cũ còn hiệu lực
        const invalidReq = new sql.Request();
        invalidReq.input('maNguoiDung', sql.Int, maNguoiDung);
        await invalidReq.query(`
            UPDATE OTP SET trangThai = 'used'
            WHERE maNguoiDung = @maNguoiDung
              AND loai = 'RESET_PASSWORD'
              AND trangThai = 'unused'
        `);

        // Tạo OTP 6 số ngẫu nhiên
        const otp = String(Math.floor(100000 + Math.random() * 900000));

        const insertReq = new sql.Request();
        insertReq.input('maNguoiDung',    sql.Int,      maNguoiDung);
        insertReq.input('maXacThuc',      sql.NVarChar,  otp);
        await insertReq.query(`
            INSERT INTO OTP (maNguoiDung, maXacThuc, thoiGianHetHan, loai, trangThai)
            VALUES (@maNguoiDung, @maXacThuc, DATEADD(minute, 5, GETDATE()), 'RESET_PASSWORD', 'unused')
        `);

        // Gửi email thật
        const emailSent = await sendOTP(email, otp);
        
        if (!emailSent) {
            return res.status(500).json({ success: false, message: 'Có lỗi khi gửi email OTP. Vui lòng thử lại sau.' });
        }

        return res.json({
            success: true,
            message: 'Mã OTP đã được gửi đến email của bạn.'
        });
    } catch (err) {
        console.error('POST /auth/forgot-password error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ─── Xác thực OTP: POST /api/auth/verify-otp ─────────────────────────────────
// Body: { email, otp }
router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Thiếu email hoặc OTP.' });
    }

    try {
        const request = new sql.Request();
        request.input('email', sql.NVarChar, email);
        request.input('otp',   sql.NVarChar, otp);

        const result = await request.query(`
            SELECT o.maOtp, o.maNguoiDung, o.thoiGianHetHan
            FROM OTP o
            INNER JOIN NguoiDung nd ON o.maNguoiDung = nd.maNguoiDung
            WHERE nd.email = @email
              AND o.maXacThuc = @otp
              AND o.loai = 'RESET_PASSWORD'
              AND o.trangThai = 'unused'
              AND o.thoiGianHetHan > GETDATE()
        `);

        if (result.recordset.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Mã OTP không hợp lệ hoặc đã hết hạn.'
            });
        }

        return res.json({ success: true, message: 'OTP hợp lệ.' });
    } catch (err) {
        console.error('POST /auth/verify-otp error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ─── Đặt lại mật khẩu: POST /api/auth/reset-password ────────────────────────
// Body: { email, otp, matKhauMoi }
router.post('/reset-password', async (req, res) => {
    const { email, otp, matKhauMoi } = req.body;
    if (!email || !otp || !matKhauMoi) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin.' });
    }
    if (matKhauMoi.length < 6) {
        return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
    }

    try {
        // Kiểm tra OTP còn hiệu lực
        const checkReq = new sql.Request();
        checkReq.input('email', sql.NVarChar, email);
        checkReq.input('otp',   sql.NVarChar, otp);

        const otpResult = await checkReq.query(`
            SELECT o.maOtp, o.maNguoiDung
            FROM OTP o
            INNER JOIN NguoiDung nd ON o.maNguoiDung = nd.maNguoiDung
            WHERE nd.email = @email
              AND o.maXacThuc = @otp
              AND o.loai = 'RESET_PASSWORD'
              AND o.trangThai = 'unused'
              AND o.thoiGianHetHan > GETDATE()
        `);

        if (otpResult.recordset.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Mã OTP không hợp lệ hoặc đã hết hạn.'
            });
        }

        const { maOtp, maNguoiDung } = otpResult.recordset[0];

        // Cập nhật mật khẩu (lưu plain text trực tiếp)
        const updateReq = new sql.Request();
        updateReq.input('maNguoiDung', sql.Int,      maNguoiDung);
        updateReq.input('matKhau',     sql.NVarChar,  matKhauMoi);
        await updateReq.query(
            `UPDATE NguoiDung SET matKhau = @matKhau WHERE maNguoiDung = @maNguoiDung`
        );

        // Đánh dấu OTP đã dùng
        const usedReq = new sql.Request();
        usedReq.input('maOtp', sql.Int, maOtp);
        await usedReq.query(`UPDATE OTP SET trangThai = 'used' WHERE maOtp = @maOtp`);

        return res.json({ success: true, message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập.' });
    } catch (err) {
        console.error('POST /auth/reset-password error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
