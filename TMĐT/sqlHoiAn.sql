-- ========================================
-- CREATE DATABASE
-- ========================================
IF DB_ID('ecommerce_detai3') IS NULL
    CREATE DATABASE ecommerce_detai3;
GO

USE ecommerce_detai3;
GO

-- 1. NguoiDung
CREATE TABLE NguoiDung (
    maNguoiDung INT PRIMARY KEY IDENTITY(1,1),
    ten NVARCHAR(100),
    email NVARCHAR(100),
    soDienThoai NVARCHAR(20),
    diaChi NVARCHAR(255),
    vaiTro NVARCHAR(50)
);
CREATE TABLE ViDienTu (
    maVi INT PRIMARY KEY IDENTITY(1,1),
    maNguoiDung INT,
    soDu DECIMAL(10,2),
    trangThai NVARCHAR(50),
    FOREIGN KEY (maNguoiDung) REFERENCES NguoiDung(maNguoiDung)
);

-- 2. OTP
CREATE TABLE OTP (
    maOtp INT PRIMARY KEY IDENTITY(1,1),
    maNguoiDung INT,
    maXacThuc NVARCHAR(10),
    thoiGianHetHan DATETIME,
    ngayTao DATETIME,
    loai NVARCHAR(50),
    FOREIGN KEY (maNguoiDung) REFERENCES NguoiDung(maNguoiDung)
);

-- 3. DanhMuc
CREATE TABLE DanhMuc (
    maDanhMuc INT PRIMARY KEY IDENTITY(1,1),
    tenDanhMuc NVARCHAR(100)
);

-- 4. SanPham
CREATE TABLE SanPham (
    maSanPham INT PRIMARY KEY IDENTITY(1,1),
    tenSanPham NVARCHAR(100),
    gia DECIMAL(10,2),
    moTa NVARCHAR(MAX),
    maDanhMuc INT,
    hinhAnh NVARCHAR(255),
    FOREIGN KEY (maDanhMuc) REFERENCES DanhMuc(maDanhMuc)
);

-- 5. ChiTietSanPham
CREATE TABLE ChiTietSanPham (
    maChiTiet INT PRIMARY KEY IDENTITY(1,1),
    maSanPham INT,
    soLuongTon INT,
    moTa NVARCHAR(MAX),
    FOREIGN KEY (maSanPham) REFERENCES SanPham(maSanPham)
);

-- 6. TonKho
CREATE TABLE TonKho (
    maSanPham INT PRIMARY KEY,
    soLuongTon INT,
    FOREIGN KEY (maSanPham) REFERENCES SanPham(maSanPham)
);

-- 7. NhaCungCap
CREATE TABLE NhaCungCap (
    maNCC INT PRIMARY KEY IDENTITY(1,1),
    tenNCC NVARCHAR(100),
    thongTinLienHe NVARCHAR(255)
);

-- 8. PhieuNhap
CREATE TABLE PhieuNhap (
    maPhieuNhap INT PRIMARY KEY IDENTITY(1,1),
    maNCC INT,
    ngayNhap DATE,
    FOREIGN KEY (maNCC) REFERENCES NhaCungCap(maNCC)
);

-- 9. ChiTietPhieuNhap
CREATE TABLE ChiTietPhieuNhap (
    maPhieuNhap INT,
    maSanPham INT,
    soLuong INT,
    giaNhap DECIMAL(10,2),
    PRIMARY KEY (maPhieuNhap, maSanPham),
    FOREIGN KEY (maPhieuNhap) REFERENCES PhieuNhap(maPhieuNhap),
    FOREIGN KEY (maSanPham) REFERENCES SanPham(maSanPham)
);

-- 10. GioHang
CREATE TABLE GioHang (
    maGioHang INT PRIMARY KEY IDENTITY(1,1),
    maNguoiDung INT,
    FOREIGN KEY (maNguoiDung) REFERENCES NguoiDung(maNguoiDung)
);

-- 11. ChiTietGioHang
CREATE TABLE ChiTietGioHang (
    maCTGH INT PRIMARY KEY IDENTITY(1,1),
    maGioHang INT,
    maSanPham INT,
    soLuong INT,
    FOREIGN KEY (maGioHang) REFERENCES GioHang(maGioHang),
    FOREIGN KEY (maSanPham) REFERENCES SanPham(maSanPham)
);

-- 12. TrangThai
CREATE TABLE TrangThai (
    maTrangThai INT PRIMARY KEY IDENTITY(1,1),
    tenTrangThai NVARCHAR(100),
    moTa NVARCHAR(MAX),
    loai NVARCHAR(50)
);
-- 15. phuongThucThanhToan
CREATE TABLE phuongThucThanhToan (
    maPTTT INT PRIMARY KEY IDENTITY(1,1),
    phuongThuc NVARCHAR(50)
);

-- 16. phuongThucVanChuyen
CREATE TABLE phuongThucVanChuyen (
    maPTVC INT PRIMARY KEY IDENTITY(1,1),
    tenPTVC NVARCHAR(100),
    moTa NVARCHAR(MAX),
    phiVanChuyen DECIMAL(10,2)
);
-- 13. DonHang
CREATE TABLE DonHang (
    maDonHang INT PRIMARY KEY IDENTITY(1,1),
    maNguoiDung INT,
    tongTien DECIMAL(10,2),
    maTrangThai INT,
	maPTTT INT,
    maPTVC INT,
	loaiDiaChi NVARCHAR(50),
    diaChiGiaoHang NVARCHAR(255),
    FOREIGN KEY (maNguoiDung) REFERENCES NguoiDung(maNguoiDung),
    FOREIGN KEY (maTrangThai) REFERENCES TrangThai(maTrangThai),
	FOREIGN KEY (maPTTT) REFERENCES phuongThucThanhToan(maPTTT),
    FOREIGN KEY (maPTVC) REFERENCES phuongThucVanChuyen(maPTVC)
);

-- 14. ChiTietDonHang
CREATE TABLE ChiTietDonHang (
    maDonHang INT,
    maSanPham INT,
    soLuong INT,
    gia DECIMAL(10,2),
    PRIMARY KEY (maDonHang, maSanPham),
    FOREIGN KEY (maDonHang) REFERENCES DonHang(maDonHang),
    FOREIGN KEY (maSanPham) REFERENCES SanPham(maSanPham)
);
-- 17. GiaoDich
CREATE TABLE GiaoDich (
    maGiaoDich INT PRIMARY KEY IDENTITY(1,1),
    thoiGian DATETIME,
    maTrangThai INT,
    soTien DECIMAL(10,2),
    momoCode NVARCHAR(100),
    maDonHang INT,
    FOREIGN KEY (maTrangThai) REFERENCES TrangThai(maTrangThai),
    FOREIGN KEY (maDonHang) REFERENCES DonHang(maDonHang)
);

-- 18. DanhGia
CREATE TABLE DanhGia (
    maDanhGia INT PRIMARY KEY IDENTITY(1,1),
    maNguoiDung INT,
    maSanPham INT,
    soSao INT,
    binhLuan NVARCHAR(MAX),
    FOREIGN KEY (maNguoiDung) REFERENCES NguoiDung(maNguoiDung),
    FOREIGN KEY (maSanPham) REFERENCES SanPham(maSanPham)
);

-- 19. PhanHoiDanhGia
CREATE TABLE PhanHoiDanhGia (
    maPhanHoi INT PRIMARY KEY IDENTITY(1,1),
    maNguoiDung INT,
    tieuDe NVARCHAR(100),
    noiDung NVARCHAR(MAX),
    trangThai NVARCHAR(50),
    ngayTao DATETIME,
    maDanhGia INT,
    FOREIGN KEY (maNguoiDung) REFERENCES NguoiDung(maNguoiDung),
    FOREIGN KEY (maDanhGia) REFERENCES DanhGia(maDanhGia)
);
-- 1. NguoiDung
INSERT INTO NguoiDung (ten, email, soDienThoai, diaChi, vaiTro)
VALUES 
(N'Admin', 'admin@gmail.com', '0900000001', N'Hà Nội', 'ADMIN'),
(N'Nguyen Van A', 'user@gmail.com', '0900000002', N'HCM', 'USER');

-- 2. DanhMuc (HỘI AN)
INSERT INTO DanhMuc (tenDanhMuc)
VALUES
(N'Thủ công mỹ nghệ'),
(N'Đặc sản địa phương'),
(N'Quà lưu niệm'),
(N'Trang phục'),
(N'Chăm sóc sức khỏe & thư giãn');

-- 3. SanPham (20 sản phẩm Hội An)
INSERT INTO SanPham (tenSanPham, gia, moTa, maDanhMuc)
VALUES
-- 1. Thủ công mỹ nghệ
(N'Đèn lồng Hội An', 120000, N'Làm thủ công truyền thống', 1),
(N'Tượng gỗ Kim Bồng', 350000, N'Chạm khắc tinh xảo', 1),
(N'Gốm Thanh Hà', 200000, N'Làng gốm nổi tiếng', 1),
(N'Tranh tre Hội An', 180000, N'Handmade độc đáo', 1),

-- 2. Đặc sản địa phương
(N'Cao lầu Hội An', 50000, N'Đặc sản nổi tiếng', 2),
(N'Mì Quảng', 45000, N'Đậm đà miền Trung', 2),
(N'Bánh đậu xanh', 70000, N'Ngọt thanh', 2),
(N'Trà thảo mộc', 90000, N'Thư giãn', 2),

-- 3. Quà lưu niệm
(N'Móc khóa đèn lồng', 30000, N'Nhỏ xinh', 3),
(N'Bưu thiếp Hội An', 20000, N'Phong cảnh phố cổ', 3),
(N'Nam châm tủ lạnh', 25000, N'Lưu niệm', 3),
(N'Sổ tay handmade', 60000, N'Giấy tái chế', 3),

-- 4. Trang phục
(N'Áo dài Hội An', 800000, N'May đo truyền thống', 4),
(N'Áo bà ba', 350000, N'Phong cách miền Trung', 4),
(N'Khăn lụa', 250000, N'Mềm mại', 4),
(N'Nón lá', 100000, N'Truyền thống Việt', 4),

-- 5. Chăm sóc sức khỏe
(N'Tinh dầu sả', 120000, N'Thư giãn', 5),
(N'Trà hoa cúc', 80000, N'Thanh lọc', 5),
(N'Bột tắm thảo dược', 150000, N'Làm đẹp da', 5),
(N'Nhang trầm', 200000, N'Thư giãn tinh thần', 5);

-- 4. ChiTietSanPham (chỉ demo 2 cái)
INSERT INTO ChiTietSanPham (maSanPham, soLuongTon, moTa)
VALUES
(1, 50, N'Đèn lồng size M'),
(2, 30, N'Tượng gỗ nhỏ');

-- 5. TonKho
INSERT INTO TonKho (maSanPham, soLuongTon)
VALUES
(1, 50),
(2, 30);

-- 6. NhaCungCap
INSERT INTO NhaCungCap (tenNCC, thongTinLienHe)
VALUES
(N'Công ty A', N'Hà Nội'),
(N'Công ty B', N'HCM');

-- 7. PhieuNhap
INSERT INTO PhieuNhap (maNCC, ngayNhap)
VALUES
(1, GETDATE()),
(2, GETDATE());

-- 8. ChiTietPhieuNhap
INSERT INTO ChiTietPhieuNhap (maPhieuNhap, maSanPham, soLuong, giaNhap)
VALUES
(1, 1, 50, 100000),
(2, 2, 30, 200000);

-- 9. GioHang
INSERT INTO GioHang (maNguoiDung)
VALUES
(2),
(1);

-- 10. ChiTietGioHang
INSERT INTO ChiTietGioHang (maGioHang, maSanPham, soLuong)
VALUES
(1, 1, 2),
(1, 2, 1);

-- 11. TrangThai
INSERT INTO TrangThai (tenTrangThai, moTa, loai)
VALUES
(N'Chờ xác nhận', N'Đơn hàng mới tạo', 'ORDER'),
(N'Đang giao', N'Đơn hàng đang vận chuyển', 'ORDER'),
(N'Đã giao', N'Giao hàng thành công', 'ORDER'),
(N'Đã hủy', N'Đơn hàng bị hủy', 'ORDER'),
(N'Đã hoàn', N'Đã hoàn trả hàng', 'ORDER'),
(N'Chờ thanh toán', N'Chưa thanh toán', 'PAYMENT'),
(N'Thành công', N'Thanh toán thành công', 'PAYMENT'),
(N'Đã hoàn tiền', N'Hoàn tiền cho khách', 'PAYMENT');
-- 14. phuongThucThanhToan
INSERT INTO phuongThucThanhToan (phuongThuc)
VALUES
(N'MOMO'),
(N'COD');
-- 15. phuongThucVanChuyen
INSERT INTO phuongThucVanChuyen (tenPTVC, moTa, phiVanChuyen)
VALUES
(N'Giao nhanh', N'1 ngày', 30000),
(N'Giao tiết kiệm', N'3 ngày', 15000);
-- 12. DonHang
INSERT INTO DonHang 
(maNguoiDung, tongTien, maTrangThai, diaChiGiaoHang, loaiDiaChi, maPTTT, maPTVC)
VALUES
(2, 470000, 1, N'123 Lê Lợi, HCM', N'Nhà', 1, 1),      -- MOMO + giao nhanh
(2, 300000, 2, N'456 Nguyễn Huệ, HCM', N'Công ty', 2, 2); -- COD + giao tiết kiệm

-- 13. ChiTietDonHang
INSERT INTO ChiTietDonHang (maDonHang, maSanPham, soLuong, gia)
VALUES
(1, 1, 1, 120000),
(1, 2, 1, 350000);


-- 16. GiaoDich
INSERT INTO GiaoDich (thoiGian, maTrangThai, soTien, momoCode, maDonHang)
VALUES
(GETDATE(), 7, 470000, 'MOMO_ABC123', 1),
(GETDATE(), 6, 300000, NULL, 2);

-- 17. DanhGia
INSERT INTO DanhGia (maNguoiDung, maSanPham, soSao, binhLuan)
VALUES
(2, 1, 5, N'Rất đẹp, chuẩn Hội An'),
(2, 2, 4, N'Khá ổn');

-- 18. PhanHoiDanhGia
INSERT INTO PhanHoiDanhGia (maNguoiDung, tieuDe, noiDung, trangThai, ngayTao, maDanhGia)
VALUES
(1, N'Phản hồi', N'Cảm ơn bạn', N'Hiển thị', GETDATE(), 1),
(1, N'Phản hồi', N'Cảm ơn góp ý', N'Hiển thị', GETDATE(), 2);

-- 19. OTP
INSERT INTO OTP (maNguoiDung, maXacThuc, thoiGianHetHan, ngayTao, loai)
VALUES
(2, '123456', DATEADD(MINUTE, 5, GETDATE()), GETDATE(), 'PAYMENT'),
(2, '654321', DATEADD(MINUTE, 5, GETDATE()), GETDATE(), 'RESET_PASSWORD');
INSERT INTO ViDienTu (maNguoiDung, soDu, trangThai)
VALUES
(1, 1000000, N'Hoạt động'), -- Admin (dư nhiều tiền)
(2, 500000, N'Hoạt động');  -- User (đủ trả đơn 470k, thiếu nếu trả cả 2)