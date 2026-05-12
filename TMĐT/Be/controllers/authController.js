const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql } = require('../config/db');

// Đăng ký người dùng mới
const register = async (req, res) => {
    const { ten, email, matKhau, soDienThoai, diaChi } = req.body;

    if (!ten || !email || !matKhau) {
        return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ: ten, email, matKhau' });
    }

    try {
        // Kiểm tra email đã tồn tại chưa
        const checkReq = new sql.Request();
        checkReq.input('email', sql.NVarChar, email);
        const checkUser = await checkReq.query('SELECT maNguoiDung FROM NguoiDung WHERE email = @email');
        if (checkUser.recordset.length > 0) {
            return res.status(400).json({ message: 'Email đã được sử dụng!' });
        }

        // Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedMatKhau = await bcrypt.hash(matKhau, salt);

        // Lưu người dùng vào DB
        const insertReq = new sql.Request();
        insertReq.input('ten',         sql.NVarChar, ten);
        insertReq.input('email',       sql.NVarChar, email);
        insertReq.input('matKhau',     sql.NVarChar, hashedMatKhau);
        insertReq.input('soDienThoai', sql.NVarChar, soDienThoai || null);
        insertReq.input('diaChi',      sql.NVarChar, diaChi || null);

        const insertResult = await insertReq.query(`
            INSERT INTO NguoiDung (ten, email, matKhau, soDienThoai, diaChi, vaiTro, trangThai)
            OUTPUT INSERTED.maNguoiDung, INSERTED.vaiTro
            VALUES (@ten, @email, @matKhau, @soDienThoai, @diaChi, 'USER', N'Hoạt động')
        `);

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
                ten,
                email,
                role: newUser.vaiTro
            }
        });
    } catch (error) {
        console.error('Lỗi đăng ký:', error);
        res.status(500).json({ message: 'Lỗi server!', detail: error.message });
    }
};

// Đăng nhập
const login = async (req, res) => {
    console.log('--- LOGIN ATTEMPT START ---');
    console.log('Body received:', req.body);
    const { email, matKhau } = req.body;

    if (!email || !matKhau) {
        return res.status(400).json({ message: 'Vui lòng cung cấp email và matKhau' });
    }

    try {
        const request = new sql.Request();
        request.input('email', sql.NVarChar, email);
        const result = await request.query('SELECT * FROM NguoiDung WHERE email = @email');

        if (result.recordset.length === 0) {
            console.log('--- USER NOT FOUND IN DB ---:', email);
            return res.status(400).json({ message: 'Email hoặc mật khẩu không chính xác!' });
        }

        const user = result.recordset[0];
        const storedHash = user.matKhau ? user.matKhau.trim() : '';

        // Kiểm tra mật khẩu
        console.log('--- LOGIN DEBUG ---');
        console.log('Email:', email);
        console.log('Password received:', matKhau);
        console.log('Stored Hash in DB:', storedHash);
        
        const isMatch = await bcrypt.compare(matKhau, storedHash);
        if (!isMatch) {
            console.log('--- Password Match Failed ---');
            return res.status(400).json({ message: 'Email hoặc mật khẩu không chính xác!' });
        }
        console.log('--- Password Match Success ---');

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
        res.status(500).json({ message: 'Lỗi server!', detail: error.message });
    }
};

module.exports = {
    register,
    login
};
