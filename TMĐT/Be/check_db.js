const { sql, connectDB } = require('./config/db');

async function checkSchema() {
    try {
        await connectDB();
        const request = new sql.Request();
        const result = await request.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'ChiTietSanPham'
        `);
        console.log('Columns in ChiTietSanPham:', result.recordset.map(c => c.COLUMN_NAME));
        
        const result2 = await request.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'SanPham'
        `);
        console.log('Columns in SanPham:', result2.recordset.map(c => c.COLUMN_NAME));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
