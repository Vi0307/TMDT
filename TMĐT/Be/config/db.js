const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER, 
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: false, // Set to true if you're on Windows Azure
        trustServerCertificate: true // Change to true for local dev / self-signed certs
    }
};

const connectDB = async () => {
    try {
        await sql.connect(config);
        console.log('✅ Kết nối Database thành công!');
    } catch (err) {
        console.error('❌ Lỗi kết nối Database:', err);
    }
};

module.exports = {
    sql,
    connectDB
};
