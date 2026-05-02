const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');

// Map trạng thái tiếng Việt <-> key frontend
const STATUS_MAP = {
    'Chờ xác nhận': 'processing',
    'Đang giao': 'delivering',
    'Đã giao': 'delivered',
    'Đã hủy': 'cancelled',
    'Đã hoàn': 'cancelled'
};
const STATUS_REVERSE = {
    'processing': 'Chờ xác nhận',
    'delivering': 'Đang giao',
    'delivered': 'Đã giao',
    'cancelled': 'Đã hủy'
};

// GET /api/admin/orders?search=...&status=...
router.get('/', async (req, res) => {
    try {
        const { search, status } = req.query;
        const request = new sql.Request();

        let query = `
            SELECT 
                dh.maDonHang,
                nd.ten AS tenKhachHang,
                dh.tongTien,
                dh.ngayDat,
                tt.tenTrangThai,
                COUNT(ctdh.maSanPham) AS soLuongSanPham
            FROM DonHang dh
            LEFT JOIN NguoiDung nd ON dh.maNguoiDung = nd.maNguoiDung
            LEFT JOIN TrangThai tt ON dh.maTrangThai = tt.maTrangThai
            LEFT JOIN ChiTietDonHang ctdh ON dh.maDonHang = ctdh.maDonHang
            WHERE tt.loai = 'ORDER'
        `;

        if (search) {
            query += ` AND (nd.ten LIKE @search OR CAST(dh.maDonHang AS NVARCHAR) LIKE @search)`;
            request.input('search', sql.NVarChar, `%${search}%`);
        }

        if (status && status !== 'all') {
            const tenTrangThai = STATUS_REVERSE[status];
            if (tenTrangThai) {
                query += ` AND tt.tenTrangThai = @tenTrangThai`;
                request.input('tenTrangThai', sql.NVarChar, tenTrangThai);
            }
        }

        query += ` GROUP BY dh.maDonHang, nd.ten, dh.tongTien, dh.ngayDat, tt.tenTrangThai ORDER BY dh.maDonHang DESC`;

        const result = await request.query(query);

        const data = result.recordset.map(row => ({
            maDonHang: row.maDonHang,
            tenKhachHang: row.tenKhachHang,
            soLuongSanPham: row.soLuongSanPham,
            tongTien: row.tongTien,
            ngayDat: row.ngayDat,
            tenTrangThai: row.tenTrangThai,
            status: STATUS_MAP[row.tenTrangThai] || 'processing'
        }));

        res.json({ success: true, data });
    } catch (err) {
        console.error('GET /orders error:', err);
        res.status(500).json({ success: false, message: err.message, stack: err.stack });
    }
});

// PUT /api/admin/orders/:id/status - Cập nhật trạng thái
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const tenTrangThai = STATUS_REVERSE[status];
        if (!tenTrangThai)
            return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });

        const request = new sql.Request();
        request.input('id', sql.Int, req.params.id);
        request.input('tenTrangThai', sql.NVarChar, tenTrangThai);

        await request.query(`
            UPDATE DonHang 
            SET maTrangThai = (SELECT maTrangThai FROM TrangThai WHERE tenTrangThai = @tenTrangThai AND loai = 'ORDER')
            WHERE maDonHang = @id
        `);

        res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
