const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER, 
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function checkOrders() {
    try {
        await sql.connect(config);
        console.log('--- NguoiDung Table ---');
        const users = await sql.query('SELECT maNguoiDung, ten, email, vaiTro FROM NguoiDung');
        console.table(users.recordset);

        console.log('\n--- ViDienTu Table ---');
        const wallets = await sql.query('SELECT maVi, maNguoiDung, soDu, trangThai FROM ViDienTu');
        console.table(wallets.recordset);

        console.log('\n--- DonHang Table ---');
        const orders = await sql.query(`
            SELECT TOP 10 maDonHang, maNguoiDung, phiVanChuyen, tongTien, maTrangThai, maPTTT 
            FROM DonHang 
            ORDER BY maDonHang DESC
        `);
        console.table(orders.recordset);

        console.log('\n--- GiaoDich Table ---');
        const txs = await sql.query(`
            SELECT TOP 10 maGiaoDich, loaiGiaoDich, maTrangThai, soTien, maDonHang 
            FROM GiaoDich 
            ORDER BY maGiaoDich DESC
        `);
        console.table(txs.recordset);
    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}

checkOrders();
