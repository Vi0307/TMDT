const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql } = require('../config/db');

// Đăng ký người dùng mới
const register = async (req, res) => {
    const { ten, email, matKhau, soDienThoai, diaChi } = req.body;

    try {
        // Kiểm tra email đã tồn tại chưa
        const checkUser = await sql.query`SELECT * FROM NguoiDung WHERE email = ${email}`;
        if (checkUser.recordset.length > 0) {
            return res.status(400).json({ message: 'Email đã được sử dụng!' });
        }

        // Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedMatKhau = await bcrypt.hash(matKhau, salt);

        // Lưu người dùng vào DB
        const pool = await sql.connect();
        const request = pool.request();
        const insertResult = await request
            .input('ten', sql.NVarChar, ten)
            .input('email', sql.NVarChar, email)
            .input('matKhau', sql.NVarChar, hashedMatKhau)
            .input('soDienThoai', sql.NVarChar, soDienThoai)
            .input('diaChi', sql.NVarChar, diaChi)
            .query('INSERT INTO NguoiDung (ten, email, matKhau, soDienThoai, diaChi, vaiTro, trangThai) OUTPUT INSERTED.maNguoiDung, INSERTED.vaiTro VALUES (@ten, @email, @matKhau, @soDienThoai, @diaChi, \'USER\', N\'Hoạt động\')');

        const newUser = insertResult.recordset[0];

        // Tạo JWT Token cho user mới
        const token = jwt.sign(
            { id: newUser.maNguoiDung, role: newUser.vaiTro },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({ 
            message: 'Đăng ký thành công!',
            token,
            user: {
                id: newUser.maNguoiDung,
                ten: ten,
                email: email,
                role: newUser.vaiTro
            }
        });
    } catch (error) {
        console.error('Lỗi đăng ký:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

// Đăng nhập
const login = async (req, res) => {
    const { email, matKhau } = req.body;

    try {
        // Tìm người dùng theo email
        const result = await sql.query`SELECT * FROM NguoiDung WHERE email = ${email}`;
        if (result.recordset.length === 0) {
            return res.status(400).json({ message: 'Email hoặc mật khẩu không chính xác!' });
        }

        const user = result.recordset[0];

        // Kiểm tra mật khẩu
        const isMatch = await bcrypt.compare(matKhau, user.matKhau);
        if (!isMatch) {
            return res.status(400).json({ message: 'Email hoặc mật khẩu không chính xác!' });
        }

        // Kiểm tra trạng thái tài khoản
        if (user.trangThai === 'Bị khóa') {
            return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa!' });
        }

        // Tạo JWT Token
        const token = jwt.sign(
            { id: user.maNguoiDung, role: user.vaiTro },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Đăng nhập thành công!',
            token,
            user: {
                id: user.maNguoiDung,
                ten: user.ten,
                email: user.email,
                role: user.vaiTro
            }
        });
    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

module.exports = {
    register,
    login
};
