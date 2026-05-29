const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');

// GET /api/admin/reports
router.get('/', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const request = new sql.Request();

        // 1. Phân tích tham số bộ lọc thời gian
        let dateFilterOrder = '';
        let dateFilterImport = '';
        let dateFilterUser = '';

        if (startDate) {
            request.input('startDate', sql.VarChar(50), startDate);
            dateFilterOrder += ' AND dh.ngayDat >= CAST(@startDate AS DATETIME)';
            dateFilterImport += ' AND pn.ngayNhap >= CAST(@startDate AS DATE)';
            dateFilterUser += ' AND nd.ngayTao >= CAST(@startDate AS DATETIME)';
        }

        if (endDate) {
            // Để bao gồm cả ngày kết thúc, thêm 23:59:59 vào bộ lọc datetime
            request.input('endDateEnd', sql.VarChar(50), `${endDate} 23:59:59`);
            request.input('endDate', sql.VarChar(50), endDate);
            
            dateFilterOrder += ' AND dh.ngayDat <= CAST(@endDateEnd AS DATETIME)';
            dateFilterImport += ' AND pn.ngayNhap <= CAST(@endDate AS DATE)';
            dateFilterUser += ' AND nd.ngayTao <= CAST(@endDateEnd AS DATETIME)';
        }

        // 2. Chạy các truy vấn thống kê

        // A. Thống kê KPI: Doanh thu (chỉ tính đơn hàng Đã giao)
        const revenueResult = await request.query(`
            SELECT ISNULL(SUM(dh.tongTien), 0) AS totalRevenue 
            FROM DonHang dh
            JOIN TrangThai tt ON dh.maTrangThai = tt.maTrangThai
            WHERE tt.tenTrangThai = N'Đã giao' AND tt.loai = 'ORDER' ${dateFilterOrder}
        `);
        const totalRevenue = revenueResult.recordset[0].totalRevenue;

        // B. Thống kê KPI: Chi phí nhập hàng (tổng từ PhieuNhap)
        // Lưu ý: PhieuNhap dùng cột ngayNhap kiểu DATE
        const expenseResult = await request.query(`
            SELECT ISNULL(SUM(pn.tongTien), 0) AS totalExpense 
            FROM PhieuNhap pn
            WHERE 1 = 1 ${dateFilterImport}
        `);
        const totalExpense = expenseResult.recordset[0].totalExpense;

        // C. Thống kê KPI: Tổng số đơn hàng
        const ordersCountResult = await request.query(`
            SELECT COUNT(dh.maDonHang) AS totalOrders 
            FROM DonHang dh
            WHERE 1 = 1 ${dateFilterOrder}
        `);
        const totalOrders = ordersCountResult.recordset[0].totalOrders;

        // D. Thống kê KPI: Số khách hàng mới (hoặc tổng số)
        const customersCountResult = await request.query(`
            SELECT COUNT(nd.maNguoiDung) AS totalCustomers 
            FROM NguoiDung nd
            WHERE nd.vaiTro = 'USER' ${dateFilterUser}
        `);
        const totalCustomers = customersCountResult.recordset[0].totalCustomers;

        // E. Thống kê KPI: Tổng số sản phẩm trong hệ thống (Không lọc ngày)
        const productsCountResult = await request.query(`
            SELECT COUNT(*) AS totalProducts FROM SanPham
        `);
        const totalProducts = productsCountResult.recordset[0].totalProducts;

        // F. Biểu đồ Doanh thu theo ngày (chỉ tính đơn hàng Đã giao)
        const revenueChartResult = await request.query(`
            SELECT 
                CONVERT(VARCHAR(10), dh.ngayDat, 120) AS dateLabel,
                SUM(dh.tongTien) AS dailyRevenue
            FROM DonHang dh
            JOIN TrangThai tt ON dh.maTrangThai = tt.maTrangThai
            WHERE tt.tenTrangThai = N'Đã giao' AND tt.loai = 'ORDER' ${dateFilterOrder}
            GROUP BY CONVERT(VARCHAR(10), dh.ngayDat, 120)
            ORDER BY dateLabel ASC
        `);
        const revenueChart = revenueChartResult.recordset;

        // G. Biểu đồ doanh thu theo danh mục sản phẩm (chỉ tính đơn hàng Đã giao)
        const categoryChartResult = await request.query(`
            SELECT 
                dm.tenDanhMuc,
                ISNULL(SUM(ctdh.soLuong * ctdh.gia), 0) AS categoryRevenue,
                ISNULL(SUM(ctdh.soLuong), 0) AS quantitySold
            FROM ChiTietDonHang ctdh
            JOIN DonHang dh ON ctdh.maDonHang = dh.maDonHang
            JOIN TrangThai tt ON dh.maTrangThai = tt.maTrangThai
            JOIN SanPham sp ON ctdh.maSanPham = sp.maSanPham
            JOIN DanhMuc dm ON sp.maDanhMuc = dm.maDanhMuc
            WHERE tt.tenTrangThai = N'Đã giao' AND tt.loai = 'ORDER' ${dateFilterOrder}
            GROUP BY dm.tenDanhMuc
            ORDER BY categoryRevenue DESC
        `);
        const categoryChart = categoryChartResult.recordset;

        // H. Top 5 Sản phẩm bán chạy nhất (chỉ tính đơn hàng Đã giao)
        const topProductsResult = await request.query(`
            SELECT TOP 5
                sp.maSanPham,
                sp.tenSanPham,
                dm.tenDanhMuc,
                SUM(ctdh.soLuong) AS quantitySold,
                SUM(ctdh.soLuong * ctdh.gia) AS totalRevenue,
                ctsp.hinhAnh
            FROM ChiTietDonHang ctdh
            JOIN DonHang dh ON ctdh.maDonHang = dh.maDonHang
            JOIN TrangThai tt ON dh.maTrangThai = tt.maTrangThai
            JOIN SanPham sp ON ctdh.maSanPham = sp.maSanPham
            LEFT JOIN DanhMuc dm ON sp.maDanhMuc = dm.maDanhMuc
            LEFT JOIN ChiTietSanPham ctsp ON sp.maSanPham = ctsp.maSanPham
            WHERE tt.tenTrangThai = N'Đã giao' AND tt.loai = 'ORDER' ${dateFilterOrder}
            GROUP BY sp.maSanPham, sp.tenSanPham, dm.tenDanhMuc, ctsp.hinhAnh
            ORDER BY quantitySold DESC
        `);
        const topProducts = topProductsResult.recordset;

        // I. Cảnh báo sản phẩm sắp hết hàng (soLuongTon < 10, không lọc ngày)
        const lowStockResult = await request.query(`
            SELECT 
                sp.maSanPham,
                sp.tenSanPham,
                dm.tenDanhMuc,
                ISNULL(ctsp.soLuongTon, 0) AS soLuongTon,
                ctsp.gia,
                ctsp.hinhAnh
            FROM SanPham sp
            JOIN ChiTietSanPham ctsp ON sp.maSanPham = ctsp.maSanPham
            LEFT JOIN DanhMuc dm ON sp.maDanhMuc = dm.maDanhMuc
            WHERE ctsp.soLuongTon < 10
            ORDER BY ctsp.soLuongTon ASC
        `);
        const lowStock = lowStockResult.recordset;

        // Trả về dữ liệu kết quả thống kê
        res.json({
            success: true,
            data: {
                summary: {
                    totalRevenue,
                    totalExpense,
                    netProfit: totalRevenue - totalExpense,
                    totalOrders,
                    totalCustomers,
                    totalProducts
                },
                revenueChart,
                categoryChart,
                topProducts,
                lowStock
            }
        });
    } catch (err) {
        console.error('GET /api/admin/reports error:', err);
        res.status(500).json({ success: false, message: err.message, stack: err.stack });
    }
});

module.exports = router;
