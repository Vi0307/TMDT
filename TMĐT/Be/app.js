const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDB } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Kết nối cơ sở dữ liệu
connectDB();

// Admin routes
app.use('/api/admin/users', require('./admin/users'));

// Route mặc định
app.get('/', (_req, res) => {
    res.send('Server is running! Database connected.');
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
