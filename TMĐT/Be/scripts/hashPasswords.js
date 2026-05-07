/**
 * Script chạy 1 lần để hash lại mật khẩu plain text trong DB
 * Chạy: node scripts/hashPasswords.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { connectDB, sql } = require('../config/db');

async function hashAllPasswords() {
    await connectDB();

    // Lấy tất cả user có mật khẩu chưa được hash (bcrypt hash bắt đầu bằng $2)
    const req = new sql.Request();
    const result = await req.query(`
        SELECT maNguoiDung, matKhau FROM NguoiDung
        WHERE matKhau NOT LIKE '$2%'
    `);

    if (result.recordset.length === 0) {
        console.log('✅ Tất cả mật khẩu đã được hash. Không cần cập nhật.');
        process.exit(0);
    }

    console.log(`🔄 Tìm thấy ${result.recordset.length} tài khoản cần hash mật khẩu...`);

    for (const user of result.recordset) {
        const hashed = await bcrypt.hash(user.matKhau, 10);
        const updateReq = new sql.Request();
        updateReq.input('id',       sql.Int,      user.maNguoiDung);
        updateReq.input('matKhau',  sql.NVarChar,  hashed);
        await updateReq.query(`
            UPDATE NguoiDung SET matKhau = @matKhau WHERE maNguoiDung = @id
        `);
        console.log(`  ✔ Đã hash mật khẩu cho user ID ${user.maNguoiDung}`);
    }

    console.log('✅ Hoàn tất! Tất cả mật khẩu đã được hash.');
    process.exit(0);
}

hashAllPasswords().catch(err => {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
});
