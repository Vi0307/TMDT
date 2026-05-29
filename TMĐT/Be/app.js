const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDB } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Giữ cho tiến trình không tự thoát
setInterval(() => {}, 1000 * 60 * 60);

// Kết nối cơ sở dữ liệu và khởi động server
const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
        console.log('--- NEW SERVER VERSION 2.0 (PASSWORD FIX) ---');
        console.log(`📋 Admin API: http://localhost:${PORT}/api/admin/`);
        console.log(`🛒 User  API: http://localhost:${PORT}/api/`);
    });
};

startServer();

// ─────────────────────────────────────────────
// ADMIN routes (giữ nguyên, không thay đổi)
// ─────────────────────────────────────────────
app.use('/api/admin/users',      require('./admin/users'));
app.use('/api/admin/categories', require('./admin/categories'));
app.use('/api/admin/products',   require('./admin/products'));
app.use('/api/admin/receipts',   require('./admin/receipts'));
app.use('/api/admin/orders',     require('./admin/orders'));
app.use('/api/admin/reviews',    require('./admin/reviews'));
app.use('/api/admin/returns',    require('./admin/returns'));
app.use('/api/admin/reports',    require('./admin/reports'));

// ─────────────────────────────────────────────
// AUTH routes
// POST /api/auth/register
// POST /api/auth/login
// ─────────────────────────────────────────────
app.use('/api/auth', require('./routes/authRoutes'));

// ─────────────────────────────────────────────
// USER — PUBLIC routes (không cần đăng nhập)
// ─────────────────────────────────────────────
// GET /api/products, GET /api/products/:id
app.use('/api/products', require('./user/products.public'));

// GET /api/categories, GET /api/categories/:id/products
app.use('/api/categories', require('./user/categories.public'));

// GET /api/posts, GET /api/posts/:id
app.use('/api/posts', require('./user/posts'));

// GET /api/products/:id/reviews (public)
app.use('/api', require('./user/reviews.user'));

// ─────────────────────────────────────────────
// USER — PROTECTED routes (cần đăng nhập / JWT)
// ─────────────────────────────────────────────
// GET/POST/PUT/DELETE /api/cart
app.use('/api/cart', require('./user/cart'));

// POST /api/orders, GET /api/orders/my-orders, GET /api/orders/:id, PUT /api/orders/:id/cancel
app.use('/api/orders', require('./user/orders.user'));

// POST /api/payments/cod, POST /api/payments/online
app.use('/api/payments', require('./user/payments'));

// POST /api/reviews (thêm đánh giá — cần đăng nhập)
app.use('/api/reviews', require('./user/reviews.user'));

// POST /api/returns, GET /api/returns/my-returns
app.use('/api/returns', require('./user/returns.user'));

// GET /api/transactions/my
app.use('/api/transactions', require('./user/transactions'));

// ─────────────────────────────────────────────
// Route mặc định
// ─────────────────────────────────────────────
app.get('/', (_req, res) => {
    res.send('Server is running! Database connected.');
});

// Xử lý lỗi toàn cục để không bị ngắt server
process.on('uncaughtException', (err) => {
    console.error('❌ LỖI HỆ THỐNG (Uncaught Exception):', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ LỖI HỆ THỐNG (Unhandled Rejection):', reason);
});
