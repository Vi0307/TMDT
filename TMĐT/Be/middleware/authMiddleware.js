/**
 * authMiddleware.js
 * Middleware xác thực JWT cho các route cần đăng nhập
 *
 * Cách dùng:
 *   const { authMiddleware } = require('../middleware/authMiddleware');
 *   router.get('/protected', authMiddleware, handler);
 *
 * Header yêu cầu:
 *   Authorization: Bearer <token>
 */

const jwt = require('jsonwebtoken');

/**
 * Xác thực token JWT.
 * Nếu hợp lệ, gắn req.user = { id, role } rồi next().
 * Nếu không hợp lệ, trả 401.
 */
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Không có token xác thực. Vui lòng đăng nhập.'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.id, role: decoded.role };
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Token không hợp lệ hoặc đã hết hạn.'
        });
    }
};

/**
 * Chỉ cho phép ADMIN truy cập.
 * Dùng sau authMiddleware.
 */
const adminOnly = (req, res, next) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền thực hiện thao tác này.'
        });
    }
    next();
};

module.exports = { authMiddleware, adminOnly };
