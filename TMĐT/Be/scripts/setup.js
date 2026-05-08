/**
 * setup.js — Chạy 1 lần sau khi pull project về
 *
 * Việc script này làm:
 *   1. Kiểm tra kết nối DB
 *   2. Thêm các cột còn thiếu vào bảng NguoiDung (matKhau, trangThai, ngayTao)
 *      nếu DB được tạo từ schema cũ
 *   3. Hash tất cả mật khẩu plain text trong bảng NguoiDung
 *
 * Cách chạy:
 *   npm run setup
 *   hoặc: node scripts/setup.js
 *
 * Lưu ý:
 *   - Phải có file .env (copy từ .env.example và điền thông tin DB)
 *   - Phải đã chạy file sqlHoiAn.sql trên SQL Server trước
 *   - Script này an toàn để chạy nhiều lần (idempotent)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { connectDB, sql } = require('../config/db');

async function setup() {
    console.log('🚀 Bắt đầu setup...\n');

    // ── 1. Kết nối DB ──────────────────────────────────────────────────────
    await connectDB();

    // ── 2. Kiểm tra và thêm cột còn thiếu ─────────────────────────────────
    const missingColumns = [
        {
            name: 'matKhau',
            sql: `ALTER TABLE NguoiDung ADD matKhau NVARCHAR(255) NOT NULL DEFAULT ''`
        },
        {
            name: 'trangThai',
            sql: `ALTER TABLE NguoiDung ADD trangThai NVARCHAR(50) NOT NULL DEFAULT N'Hoạt động'`
        },
        {
            name: 'ngayTao',
            sql: `ALTER TABLE NguoiDung ADD ngayTao DATETIME NOT NULL DEFAULT GETDATE()`
        }
    ];

    for (const col of missingColumns) {
        const check = await new sql.Request().query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'NguoiDung' AND COLUMN_NAME = '${col.name}'
        `);
        if (check.recordset.length === 0) {
            await new sql.Request().query(col.sql);
            console.log(`  ✔ Đã thêm cột "${col.name}"`);
        } else {
            console.log(`  ✔ Cột "${col.name}" đã tồn tại`);
        }
    }

    // ── 3. Hash mật khẩu plain text ────────────────────────────────────────
    console.log('\n🔐 Kiểm tra mật khẩu...');

    const users = await new sql.Request().query(
        `SELECT maNguoiDung, email, matKhau FROM NguoiDung`
    );

    let hashedCount = 0;
    for (const user of users.recordset) {
        // Bỏ qua nếu đã là bcrypt hash (bắt đầu bằng $2)
        if (user.matKhau && user.matKhau.startsWith('$2')) {
            console.log(`  ✔ [${user.email}] mật khẩu đã được hash`);
            continue;
        }

        // Hash mật khẩu hiện tại (plain text)
        const plainPwd = user.matKhau && user.matKhau.length > 0
            ? user.matKhau
            : '123456';
        const hashed = await bcrypt.hash(plainPwd, 10);

        const req = new sql.Request();
        req.input('id',  sql.Int,      user.maNguoiDung);
        req.input('pwd', sql.NVarChar, hashed);
        await req.query(`UPDATE NguoiDung SET matKhau = @pwd WHERE maNguoiDung = @id`);

        console.log(`  ✔ [${user.email}] đã hash mật khẩu "${plainPwd}"`);
        hashedCount++;
    }

    // ── 4. Kiểm tra JWT_SECRET ─────────────────────────────────────────────
    console.log('\n🔑 Kiểm tra cấu hình...');
    if (!process.env.JWT_SECRET) {
        console.warn('  ⚠ JWT_SECRET chưa được cấu hình trong .env!');
        console.warn('    Thêm dòng: JWT_SECRET=your_secret_key_here');
    } else {
        console.log('  ✔ JWT_SECRET đã được cấu hình');
    }

    // ── 5. Tổng kết ────────────────────────────────────────────────────────
    console.log('\n✅ Setup hoàn tất!');
    console.log('─────────────────────────────────────');
    console.log('Tài khoản mặc định:');

    const finalUsers = await new sql.Request().query(
        `SELECT email, vaiTro FROM NguoiDung`
    );
    finalUsers.recordset.forEach(u => {
        console.log(`  ${u.vaiTro === 'ADMIN' ? '👑' : '👤'} ${u.email} / 123456 (${u.vaiTro})`);
    });

    console.log('─────────────────────────────────────');
    console.log('Chạy server: npm run dev\n');

    process.exit(0);
}

setup().catch(err => {
    console.error('\n❌ Setup thất bại:', err.message);
    console.error('\nKiểm tra lại:');
    console.error('  1. File .env đã được tạo từ .env.example chưa?');
    console.error('  2. SQL Server đang chạy chưa?');
    console.error('  3. File sqlHoiAn.sql đã được chạy trên SQL Server chưa?');
    process.exit(1);
});
