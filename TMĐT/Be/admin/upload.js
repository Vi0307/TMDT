const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Thư mục lưu ảnh: ../fe/images/UPLOADS (tương đối từ file này)
const UPLOAD_DIR = path.join(__dirname, '../../fe/images/UPLOADS');

// Tạo thư mục nếu chưa có
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        // Tên file: timestamp + tên gốc (đã làm sạch ký tự đặc biệt)
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, Date.now() + '_' + safeName);
    }
});

// Chỉ cho phép ảnh
const fileFilter = (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận file ảnh (jpg, png, webp, gif)'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // tối đa 5MB
});

// POST /api/admin/upload/image
// Body: multipart/form-data, field "image"
// Trả về: { success: true, url: "http://localhost:3005/images/UPLOADS/xxx.jpg", path: "UPLOADS/xxx.jpg" }
router.post('/image', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Không có file được upload' });
    }

    const relativePath = 'UPLOADS/' + req.file.filename;
    const fullUrl = `${req.protocol}://${req.get('host')}/images/${relativePath}`;

    res.json({
        success: true,
        url: fullUrl,
        path: relativePath
    });
});

// Xử lý lỗi multer
router.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: 'File quá lớn, tối đa 5MB' });
        }
    }
    res.status(400).json({ success: false, message: err.message });
});

module.exports = router;
