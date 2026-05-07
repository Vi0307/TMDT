/**
 * Script migrate DB: thêm cột matKhau, trangThai, ngayTao vào NguoiDung
 * và hash mật khẩu plain text
 * Chạy: node scripts/migrateDB.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { connectDB, sql } = require('../config/db');

async function migrate() {
    await connectDB();

    // Kiểm tra cột matKhau đã tồn tại chưa
    const colCheck = await new sql.Request().query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'NguoiDung' AND COLUMN_NAME = 'matKhau'
    `);

    if (colCheck.recordset.length === 0) {
        console.log('🔄 Thêm cột matKhau...');
        await new sql.Request().query(`
            ALTER TABLE NguoiDung ADD matKhau NVARCHAR(255) NOT NULL DEFAULT ''
        `);
        console.log('  ✔ Đã thêm cột matKhau');
    } else {
        console.log('  ✔ Cột matKhau đã tồn tại');
    }

    // Kiểm tra cột trangThai
    const ttCheck = await new sql.Request().query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'NguoiDung' AND COLUMN_NAME = 'trangThai'
    `);

    if (ttCheck.recordset.length === 0) {
        console.log('🔄 Thêm cột trangThai...');
        await new sql.Request().query(`
            ALTER TABLE NguoiDung ADD trangThai NVARCHAR(50) NOT NULL DEFAULT N'Hoạt động'
        `);
        console.log('  ✔ Đã thêm cột trangThai');
    } else {
        console.log('  ✔ Cột trangThai đã tồn tại');
    }

    // Kiểm tra cột ngayTao
    const ntCheck = await new sql.Request().query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'NguoiDung' AND COLUMN_NAME = 'ngayTao'
    `);

    if (ntCheck.recordset.length === 0) {
        console.log('🔄 Thêm cột ngayTao...');
        await new sql.Request().query(`
            ALTER TABLE NguoiDung ADD ngayTao DATETIME NOT NULL DEFAULT GETDATE()
        `);
        console.log('  ✔ Đã thêm cột ngayTao');
    } else {
        console.log('  ✔ Cột ngayTao đã tồn tại');
    }

    // Cập nhật mật khẩu mặc định '123456' cho các user chưa có hash
    const users = await new sql.Request().query(`
        SELECT maNguoiDung, matKhau FROM NguoiDung
    `);

    console.log('\n🔄 Hash mật khẩu cho các tài khoản...');
    for (const user of users.recordset) {
        // Nếu chưa phải bcrypt hash (không bắt đầu bằng $2)
        if (!user.matKhau || !user.matKhau.startsWith('$2')) {
            // Dùng mật khẩu hiện tại nếu có, không thì dùng '123456'
            const plainPwd = user.matKhau && user.matKhau.length > 0 ? user.matKhau : '123456';
            const hashed = await bcrypt.hash(plainPwd, 10);
            const updateReq = new sql.Request();
            updateReq.input('id',      sql.Int,      user.maNguoiDung);
            updateReq.input('pwd',     sql.NVarChar,  hashed);
            await updateReq.query(`UPDATE NguoiDung SET matKhau = @pwd WHERE maNguoiDung = @id`);
            console.log(`  ✔ User ID ${user.maNguoiDung}: đã hash mật khẩu "${plainPwd}"`);
        } else {
            console.log(`  ✔ User ID ${user.maNguoiDung}: mật khẩu đã được hash, bỏ qua`);
        }
    }

    console.log('\n✅ Migration hoàn tất!');
    console.log('   Tài khoản mặc định:');
    console.log('   - admin@gmail.com / 123456 (ADMIN)');
    console.log('   - user@gmail.com   / 123456 (USER)');
    process.exit(0);
}

migrate().catch(err => {
    console.error('❌ Lỗi migration:', err.message);
    process.exit(1);
});
