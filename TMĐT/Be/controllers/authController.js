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

        // Lưu người dùng vào DB (lưu plain text trực tiếp)
        const insertReq = new sql.Request();
        insertReq.input('ten',         sql.NVarChar, ten);
        insertReq.input('email',       sql.NVarChar, email);
        insertReq.input('matKhau',     sql.NVarChar, matKhau);
        insertReq.input('soDienThoai', sql.NVarChar, soDienThoai || null);
        insertReq.input('diaChi',      sql.NVarChar, diaChi || null);

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
    const { email, matKhau } = req.body;

    if (!email || !matKhau) {
        return res.status(400).json({ message: 'Vui lòng cung cấp email và matKhau' });
    }

    try {
        const request = new sql.Request();
        request.input('email', sql.NVarChar, email);
        const result = await request.query('SELECT * FROM NguoiDung WHERE email = @email');

        if (result.recordset.length === 0) {
            return res.status(400).json({ message: 'Email hoặc mật khẩu không chính xác!' });
        }

        const user = result.recordset[0];
        const storedHash = user.matKhau ? user.matKhau.trim() : '';

        let isMatch = false;

        if (storedHash.startsWith('$2')) {
            // Mật khẩu đã được hash bằng bcrypt → so sánh bình thường
            isMatch = await bcrypt.compare(matKhau, storedHash);
        } else {
            // Mật khẩu còn là plain text → so sánh trực tiếp
            isMatch = (matKhau === storedHash);
        }

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
        res.status(500).json({ message: 'Lỗi server!', detail: error.message });
    }
};

module.exports = {
    register,
    login
};
