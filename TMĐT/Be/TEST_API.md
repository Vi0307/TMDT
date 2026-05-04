# 🧪 HƯỚNG DẪN TEST API

## 📋 Chuẩn bị

### 1. Khởi động server
```bash
cd "TMĐT/Be"
npm run dev
```

Server chạy tại: `http://localhost:3000`

### 2. Cài đặt công cụ test
- **Postman**: https://www.postman.com/downloads/
- **Thunder Client** (VS Code): Extension ID `rangav.vscode-thunder-client`
- **REST Client** (VS Code): Extension ID `humao.rest-client`

---

## 🔐 1. AUTH - Xác thực

### 1.1. Đăng ký tài khoản mới
```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "ten": "Nguyen Van Test",
  "email": "test@gmail.com",
  "matKhau": "123456",
  "soDienThoai": "0900000099",
  "diaChi": "123 Test Street, HCM"
}
```

**Response mong đợi:**
```json
{
  "success": true,
  "message": "Đăng ký thành công!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 3,
    "ten": "Nguyen Van Test",
    "email": "test@gmail.com",
    "role": "USER"
  }
}
```

**⚠️ LƯU TOKEN** để dùng cho các request sau!

---

### 1.2. Đăng nhập
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "haip59621@gmail.com",
  "matKhau": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đăng nhập thành công!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

---

## 🛍️ 2. PRODUCTS - Sản phẩm (PUBLIC)

### 2.1. Danh sách sản phẩm
```http
GET http://localhost:3000/api/products
```

### 2.2. Tìm kiếm + lọc
```http
GET http://localhost:3000/api/products?keyword=SP1&category=1&minPrice=10000&maxPrice=50000&page=1&limit=5
```

### 2.3. Chi tiết sản phẩm
```http
GET http://localhost:3000/api/products/1
```

**Response có kèm đánh giá:**
```json
{
  "success": true,
  "data": {
    "maSanPham": 1,
    "tenSanPham": "SP1",
    "gia": 10000,
    "soLuongTon": 50,
    "diemTrungBinh": 5,
    "danhGia": [
      {
        "maDanhGia": 1,
        "tenNguoiDung": "Nguyen Van A",
        "soSao": 5,
        "binhLuan": "Sản phẩm tốt...",
        "phanHoiAdmin": "Cảm ơn bạn..."
      }
    ]
  }
}
```

---

## 📂 3. CATEGORIES - Danh mục (PUBLIC)

### 3.1. Danh sách danh mục
```http
GET http://localhost:3000/api/categories
```

### 3.2. Sản phẩm theo danh mục
```http
GET http://localhost:3000/api/categories/1/products?page=1&limit=10
```

---

## 🛒 4. CART - Giỏ hàng (CẦN TOKEN)

**⚠️ Tất cả request dưới đây cần header:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

### 4.1. Xem giỏ hàng
```http
GET http://localhost:3000/api/cart
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4.2. Thêm sản phẩm vào giỏ
```http
POST http://localhost:3000/api/cart
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "maSanPham": 1,
  "soLuong": 2
}
```

### 4.3. Cập nhật số lượng
```http
PUT http://localhost:3000/api/cart/1
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "soLuong": 5
}
```
*(1 là maCTGH, lấy từ GET /cart)*

### 4.4. Xóa sản phẩm khỏi giỏ
```http
DELETE http://localhost:3000/api/cart/1
Authorization: Bearer YOUR_TOKEN
```

### 4.5. Xóa toàn bộ giỏ hàng
```http
DELETE http://localhost:3000/api/cart
Authorization: Bearer YOUR_TOKEN
```

---

## 📦 5. ORDERS - Đơn hàng (CẦN TOKEN)

### 5.1. Đặt hàng từ giỏ hàng
```http
POST http://localhost:3000/api/orders
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "diaChiGiaoHang": "123 Lê Lợi, HCM",
  "loaiDiaChi": "Nhà",
  "maPTTT": 2,
  "maPTVC": 1
}
```
- `maPTTT`: 1=MOMO, 2=COD
- `maPTVC`: 1=Nhanh (15k, 5 ngày), 2=Hỏa tốc (30k, 2 ngày)

### 5.2. Đặt hàng trực tiếp (không qua giỏ)
```http
POST http://localhost:3000/api/orders
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "diaChiGiaoHang": "456 Nguyễn Huệ, HCM",
  "loaiDiaChi": "Công ty",
  "maPTTT": 1,
  "maPTVC": 2,
  "items": [
    { "maSanPham": 1, "soLuong": 2 },
    { "maSanPham": 3, "soLuong": 1 }
  ]
}
```

### 5.3. Danh sách đơn hàng của tôi
```http
GET http://localhost:3000/api/orders/my-orders
Authorization: Bearer YOUR_TOKEN
```

### 5.4. Lọc theo trạng thái
```http
GET http://localhost:3000/api/orders/my-orders?status=processing&page=1&limit=5
Authorization: Bearer YOUR_TOKEN
```
- `status`: `processing` | `delivering` | `delivered` | `cancelled`

### 5.5. Chi tiết đơn hàng
```http
GET http://localhost:3000/api/orders/1
Authorization: Bearer YOUR_TOKEN
```

### 5.6. Hủy đơn hàng
```http
PUT http://localhost:3000/api/orders/1/cancel
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "lyDoHuy": "Đặt nhầm sản phẩm"
}
```
**⚠️ Chỉ hủy được khi đơn đang "Chờ xác nhận"**

---

## 💳 6. PAYMENTS - Thanh toán (CẦN TOKEN)

### 6.1. Thanh toán COD
```http
POST http://localhost:3000/api/payments/cod
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "maDonHang": 1
}
```

### 6.2. Thanh toán Online (mock MOMO)
```http
POST http://localhost:3000/api/payments/online
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "maDonHang": 2,
  "momoCode": "MOMO_TEST_123"
}
```

---

## ⭐ 7. REVIEWS - Đánh giá

### 7.1. Thêm đánh giá (CẦN TOKEN)
```http
POST http://localhost:3000/api/reviews
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "maSanPham": 1,
  "soSao": 5,
  "binhLuan": "Sản phẩm rất đẹp, giao hàng nhanh!"
}
```
**⚠️ Chỉ đánh giá được khi đã mua và nhận hàng (đơn "Đã giao")**

### 7.2. Xem đánh giá sản phẩm (PUBLIC)
```http
GET http://localhost:3000/api/products/1/reviews?page=1&limit=5
```

---

## 🔄 8. RETURNS - Hoàn hàng (CẦN TOKEN)

### 8.1. Gửi yêu cầu hoàn hàng
```http
POST http://localhost:3000/api/returns
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "maDonHang": 1,
  "lyDo": "Sản phẩm bị lỗi khi nhận hàng"
}
```
**⚠️ Chỉ hoàn được khi đơn "Đã giao"**

### 8.2. Danh sách yêu cầu hoàn hàng
```http
GET http://localhost:3000/api/returns/my-returns?page=1&limit=10
Authorization: Bearer YOUR_TOKEN
```

---

## 💰 9. TRANSACTIONS - Lịch sử giao dịch (CẦN TOKEN)

### 9.1. Xem lịch sử giao dịch
```http
GET http://localhost:3000/api/transactions/my
Authorization: Bearer YOUR_TOKEN
```

### 9.2. Lọc theo loại
```http
GET http://localhost:3000/api/transactions/my?loai=PAYMENT&page=1&limit=10
Authorization: Bearer YOUR_TOKEN
```
- `loai`: `PAYMENT` | `REFUND`

---

## 📰 10. POSTS - Bài viết giới thiệu (PUBLIC)

### 10.1. Danh sách bài viết
```http
GET http://localhost:3000/api/posts
```

### 10.2. Chi tiết bài viết
```http
GET http://localhost:3000/api/posts/1
```

---

## 🎯 FLOW TEST HOÀN CHỈNH

### Kịch bản: Khách hàng mua hàng từ đầu đến cuối

```
1. Đăng ký tài khoản
   POST /api/auth/register
   → Lưu token

2. Xem sản phẩm
   GET /api/products
   GET /api/products/1

3. Thêm vào giỏ hàng
   POST /api/cart (maSanPham: 1, soLuong: 2)
   POST /api/cart (maSanPham: 2, soLuong: 1)

4. Xem giỏ hàng
   GET /api/cart

5. Đặt hàng
   POST /api/orders
   → Lưu maDonHang

6. Thanh toán
   POST /api/payments/cod (maDonHang: X)

7. Xem đơn hàng
   GET /api/orders/my-orders
   GET /api/orders/X

8. (Admin cập nhật trạng thái → "Đã giao")

9. Đánh giá sản phẩm
   POST /api/reviews (maSanPham: 1, soSao: 5)

10. (Nếu cần) Hoàn hàng
    POST /api/returns (maDonHang: X)
```

---

## 🐛 XỬ LÝ LỖI THƯỜNG GẶP

### Lỗi 401 Unauthorized
```json
{
  "success": false,
  "message": "Không có token xác thực. Vui lòng đăng nhập."
}
```
**Giải pháp:** Thêm header `Authorization: Bearer YOUR_TOKEN`

### Lỗi 400 Bad Request
```json
{
  "success": false,
  "message": "Không đủ hàng. Tồn kho: 10"
}
```
**Giải pháp:** Kiểm tra dữ liệu gửi lên, đọc message để biết lỗi cụ thể

### Lỗi 404 Not Found
```json
{
  "success": false,
  "message": "Không tìm thấy sản phẩm."
}
```
**Giải pháp:** Kiểm tra ID có tồn tại trong DB không

### Lỗi 500 Internal Server Error
**Giải pháp:** Xem log server trong terminal, thường là lỗi SQL hoặc thiếu biến môi trường

---

## 📝 POSTMAN COLLECTION

Tạo collection trong Postman với biến:
- `baseUrl`: `http://localhost:3000`
- `token`: (cập nhật sau khi login)

Dùng `{{baseUrl}}` và `{{token}}` trong các request để dễ quản lý.

---

## 🔧 KIỂM TRA DATABASE

Sau mỗi thao tác, kiểm tra DB để đảm bảo dữ liệu đúng:

```sql
-- Kiểm tra giỏ hàng
SELECT * FROM GioHang WHERE maNguoiDung = 2;
SELECT * FROM ChiTietGioHang WHERE maGioHang = 1;

-- Kiểm tra đơn hàng
SELECT * FROM DonHang WHERE maNguoiDung = 2;
SELECT * FROM ChiTietDonHang WHERE maDonHang = 1;

-- Kiểm tra tồn kho
SELECT sp.tenSanPham, ct.soLuongTon 
FROM SanPham sp 
LEFT JOIN ChiTietSanPham ct ON sp.maSanPham = ct.maSanPham;

-- Kiểm tra giao dịch
SELECT * FROM GiaoDich WHERE maDonHang = 1;
```

---

## ✅ CHECKLIST TEST

- [ ] Đăng ký tài khoản mới
- [ ] Đăng nhập
- [ ] Xem danh sách sản phẩm
- [ ] Tìm kiếm sản phẩm
- [ ] Xem chi tiết sản phẩm
- [ ] Thêm vào giỏ hàng
- [ ] Cập nhật giỏ hàng
- [ ] Xóa khỏi giỏ hàng
- [ ] Đặt hàng từ giỏ
- [ ] Đặt hàng trực tiếp
- [ ] Xem danh sách đơn hàng
- [ ] Xem chi tiết đơn hàng
- [ ] Hủy đơn hàng
- [ ] Thanh toán COD
- [ ] Thanh toán Online
- [ ] Đánh giá sản phẩm
- [ ] Xem đánh giá
- [ ] Gửi yêu cầu hoàn hàng
- [ ] Xem lịch sử giao dịch
- [ ] Xem bài viết giới thiệu
