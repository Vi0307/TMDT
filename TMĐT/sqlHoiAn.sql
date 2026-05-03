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
    email NVARCHAR(100) UNIQUE,
	matKhau NVARCHAR(255),
    soDienThoai NVARCHAR(20) UNIQUE,
    diaChi NVARCHAR(255),
    vaiTro NVARCHAR(50)
);

-- Ví điện tử (optional)
CREATE TABLE ViDienTu (
    maVi INT PRIMARY KEY IDENTITY(1,1),
    maNguoiDung INT,
    soDu DECIMAL(10,2) DEFAULT 0,
    trangThai NVARCHAR(50),
    FOREIGN KEY (maNguoiDung) REFERENCES NguoiDung(maNguoiDung)
);

-- 2. OTP
CREATE TABLE OTP (
    maOtp INT PRIMARY KEY IDENTITY(1,1),
    maNguoiDung INT,
    maXacThuc NVARCHAR(10),
    thoiGianHetHan DATETIME,
    ngayTao DATETIME DEFAULT GETDATE(),
    loai NVARCHAR(50),
    trangThai NVARCHAR(50), -- used / unused
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
    maSanPham INT UNIQUE,
    soLuongTon INT NOT NULL,
    moTa NVARCHAR(MAX),
    FOREIGN KEY (maSanPham) REFERENCES SanPham(maSanPham)
);

-- 6. Nhà cung cấp
CREATE TABLE NhaCungCap (
    maNCC INT PRIMARY KEY IDENTITY(1,1),
    tenNCC NVARCHAR(100),
    thongTinLienHe NVARCHAR(255)
);

-- 7. Phiếu nhập
CREATE TABLE PhieuNhap (
    maPhieuNhap INT PRIMARY KEY IDENTITY(1,1),
    maNCC INT,
    ngayNhap DATE,
    FOREIGN KEY (maNCC) REFERENCES NhaCungCap(maNCC)
);

-- 8. Chi tiết phiếu nhập
CREATE TABLE ChiTietPhieuNhap (
    maPhieuNhap INT,
    maSanPham INT,
    soLuong INT,
    giaNhap DECIMAL(10,2),
    PRIMARY KEY (maPhieuNhap, maSanPham),
    FOREIGN KEY (maPhieuNhap) REFERENCES PhieuNhap(maPhieuNhap),
    FOREIGN KEY (maSanPham) REFERENCES SanPham(maSanPham)
);

-- 9. Giỏ hàng
CREATE TABLE GioHang (
    maGioHang INT PRIMARY KEY IDENTITY(1,1),
    maNguoiDung INT,
    FOREIGN KEY (maNguoiDung) REFERENCES NguoiDung(maNguoiDung)
);

-- 10. Chi tiết giỏ hàng
CREATE TABLE ChiTietGioHang (
    maCTGH INT PRIMARY KEY IDENTITY(1,1),
    maGioHang INT,
    maSanPham INT,
    soLuong INT,
    FOREIGN KEY (maGioHang) REFERENCES GioHang(maGioHang),
    FOREIGN KEY (maSanPham) REFERENCES SanPham(maSanPham)
);

-- 11. Trang thái
CREATE TABLE TrangThai (
    maTrangThai INT PRIMARY KEY IDENTITY(1,1),
    tenTrangThai NVARCHAR(100),
    moTa NVARCHAR(MAX),
    loai NVARCHAR(50),
    CHECK (loai IN ('ORDER', 'PAYMENT', 'RETURN'))
);

-- 12. Phương thức thanh toán
CREATE TABLE phuongThucThanhToan (
    maPTTT INT PRIMARY KEY IDENTITY(1,1),
    phuongThuc NVARCHAR(50)
);

-- 13. Phương thức vận chuyển
CREATE TABLE phuongThucVanChuyen (
    maPTVC INT PRIMARY KEY IDENTITY(1,1),
    tenPTVC NVARCHAR(100),
    moTa NVARCHAR(MAX),
    phiVanChuyen DECIMAL(10,2),
    soNgayDuKien INT NOT NULL
);

-- 14. Đơn hàng
CREATE TABLE DonHang (
    maDonHang INT PRIMARY KEY IDENTITY(1,1),
    maNguoiDung INT,
    phiVanChuyen DECIMAL(10,2),
    soNgayDuKien INT NOT NULL,
    tongTien DECIMAL(10,2),
    maTrangThai INT,
    maPTTT INT,
    maPTVC INT,
    loaiDiaChi NVARCHAR(50),
    diaChiGiaoHang NVARCHAR(255),
    ngayDat DATETIME DEFAULT GETDATE(),
    ngayXacNhan DATETIME,
    ngayDuKienGiao AS DATEADD(DAY, soNgayDuKien, ngayDat),
    ngayGiaoHang DATETIME,
    ngayHoanThanh DATETIME,
    ngayHuy DATETIME,
    lyDoHuy NVARCHAR(255),

    FOREIGN KEY (maNguoiDung) REFERENCES NguoiDung(maNguoiDung),
    FOREIGN KEY (maTrangThai) REFERENCES TrangThai(maTrangThai),
    FOREIGN KEY (maPTTT) REFERENCES phuongThucThanhToan(maPTTT),
    FOREIGN KEY (maPTVC) REFERENCES phuongThucVanChuyen(maPTVC)
);

-- 15. Chi tiết đơn hàng
CREATE TABLE ChiTietDonHang (
    maDonHang INT,
    maSanPham INT,
    soLuong INT,
    gia DECIMAL(10,2),
    PRIMARY KEY (maDonHang, maSanPham),
    FOREIGN KEY (maDonHang) REFERENCES DonHang(maDonHang),
    FOREIGN KEY (maSanPham) REFERENCES SanPham(maSanPham)
);

-- 16. Giao dịch
CREATE TABLE GiaoDich (
    maGiaoDich INT PRIMARY KEY IDENTITY(1,1),
    loaiGiaoDich NVARCHAR(50) NOT NULL,
    thoiGian DATETIME DEFAULT GETDATE(),
    maTrangThai INT,
    soTien DECIMAL(10,2) NOT NULL,
    momoCode NVARCHAR(100),
    maDonHang INT,

    FOREIGN KEY (maTrangThai) REFERENCES TrangThai(maTrangThai),
    FOREIGN KEY (maDonHang) REFERENCES DonHang(maDonHang),

    CHECK (loaiGiaoDich IN ('PAYMENT', 'REFUND'))
);

-- 17. Đánh giá
CREATE TABLE DanhGia (
    maDanhGia INT PRIMARY KEY IDENTITY(1,1),
    maNguoiDung INT,
    maSanPham INT,
    soSao INT,
    binhLuan NVARCHAR(MAX),

    FOREIGN KEY (maNguoiDung) REFERENCES NguoiDung(maNguoiDung),
    FOREIGN KEY (maSanPham) REFERENCES SanPham(maSanPham)
);

-- 18. Phản hồi đánh giá
CREATE TABLE PhanHoiDanhGia (
    maPhanHoi INT PRIMARY KEY IDENTITY(1,1),
    maNguoiDung INT,
    tieuDe NVARCHAR(100),
    noiDung NVARCHAR(MAX),
    trangThai NVARCHAR(50),
    ngayTao DATETIME DEFAULT GETDATE(),
    maDanhGia INT,

    FOREIGN KEY (maNguoiDung) REFERENCES NguoiDung(maNguoiDung),
    FOREIGN KEY (maDanhGia) REFERENCES DanhGia(maDanhGia)
);

-- 19. Yêu cầu hoàn hàng
CREATE TABLE YeuCauHoanHang (
    maYeuCau INT PRIMARY KEY IDENTITY(1,1),
    maDonHang INT,
    maNguoiDung INT,
    ngayYeuCau DATETIME DEFAULT GETDATE(),
    lyDo NVARCHAR(255),
    maTrangThai INT,
    ngayXuLy DATETIME,
    ghiChu NVARCHAR(255),

    FOREIGN KEY (maDonHang) REFERENCES DonHang(maDonHang),
    FOREIGN KEY (maNguoiDung) REFERENCES NguoiDung(maNguoiDung),
    FOREIGN KEY (maTrangThai) REFERENCES TrangThai(maTrangThai)
);
-- 1. NguoiDung
INSERT INTO NguoiDung (ten, email, soDienThoai, diaChi, vaiTro, matKhau)
VALUES 
(N'Admin', 'admin@gmail.com', '0900000001', N'Hà Nội', 'ADMIN', '123456'),
(N'Nguyen Van A', 'haip59621@gmail.com', '0900000002', N'HCM', 'USER', '123456');

-- 2. ViDienTu
INSERT INTO ViDienTu (maNguoiDung, soDu, trangThai)
VALUES
(1, 1000000, N'Hoạt động'),
(2, 500000, N'Hoạt động');

-- 3. OTP
INSERT INTO OTP (maNguoiDung, maXacThuc, thoiGianHetHan, loai, trangThai)
VALUES
(2, '123456', DATEADD(MINUTE, 5, GETDATE()), 'PAYMENT', 'unused'),
(2, '654321', DATEADD(MINUTE, 5, GETDATE()), 'RESET_PASSWORD', 'unused');

-- 4. DanhMuc
INSERT INTO DanhMuc (tenDanhMuc)
VALUES
(N'Thủ công mỹ nghệ'),
(N'Đặc sản'),
(N'Quà lưu niệm'),
(N'Trang phục'),
(N'Sức khỏe');

-- 5. SanPham (20 sản phẩm)
INSERT INTO SanPham (tenSanPham, gia, moTa, maDanhMuc)
VALUES
(N'SP1',10000,N'',1),(N'SP2',20000,N'',1),(N'SP3',30000,N'',1),(N'SP4',40000,N'',1),
(N'SP5',50000,N'',2),(N'SP6',60000,N'',2),(N'SP7',70000,N'',2),(N'SP8',80000,N'',2),
(N'SP9',90000,N'',3),(N'SP10',100000,N'',3),(N'SP11',110000,N'',3),(N'SP12',120000,N'',3),
(N'SP13',130000,N'',4),(N'SP14',140000,N'',4),(N'SP15',150000,N'',4),(N'SP16',160000,N'',4),
(N'SP17',170000,N'',5),(N'SP18',180000,N'',5),(N'SP19',190000,N'',5),(N'SP20',200000,N'',5);

-- 6. ChiTietSanPham (20 dòng)
INSERT INTO ChiTietSanPham (maSanPham, soLuongTon, moTa)
VALUES
(1,50,N''),(2,50,N''),(3,50,N''),(4,50,N''),
(5,50,N''),(6,50,N''),(7,50,N''),(8,50,N''),
(9,50,N''),(10,50,N''),(11,50,N''),(12,50,N''),
(13,50,N''),(14,50,N''),(15,50,N''),(16,50,N''),
(17,50,N''),(18,50,N''),(19,50,N''),(20,50,N'');

-- 7. NhaCungCap
INSERT INTO NhaCungCap (tenNCC, thongTinLienHe)
VALUES
(N'NCC A',N'HN'),
(N'NCC B',N'HCM');

-- 8. PhieuNhap
INSERT INTO PhieuNhap (maNCC, ngayNhap)
VALUES
(1,GETDATE()),
(2,GETDATE());

-- 9. ChiTietPhieuNhap
INSERT INTO ChiTietPhieuNhap (maPhieuNhap, maSanPham, soLuong, giaNhap)
VALUES
(1,1,50,8000),
(2,2,50,15000);

-- 10. GioHang
INSERT INTO GioHang (maNguoiDung)
VALUES (2);

-- 11. ChiTietGioHang
INSERT INTO ChiTietGioHang (maGioHang, maSanPham, soLuong)
VALUES
(1,1,2),
(1,2,1);

-- 12. TrangThai (FULL đủ ORDER + PAYMENT + RETURN)
INSERT INTO TrangThai (tenTrangThai, moTa, loai)
VALUES
-- ORDER
(N'Chờ xác nhận',N'', 'ORDER'),
(N'Đang giao',N'', 'ORDER'),
(N'Đã giao',N'', 'ORDER'),
(N'Đã hủy',N'', 'ORDER'),

-- PAYMENT
(N'Chờ thanh toán',N'', 'PAYMENT'),
(N'Thành công',N'', 'PAYMENT'),
(N'Đã hoàn tiền',N'', 'PAYMENT'),

-- RETURN
(N'Chờ duyệt hoàn',N'', 'RETURN'),
(N'Đã duyệt hoàn',N'', 'RETURN'),
(N'Từ chối hoàn',N'', 'RETURN');

-- 13. phuongThucThanhToan
INSERT INTO phuongThucThanhToan (phuongThuc)
VALUES
(N'MOMO'),
(N'COD');

-- 14. phuongThucVanChuyen
INSERT INTO phuongThucVanChuyen (tenPTVC, moTa, phiVanChuyen, soNgayDuKien)
VALUES
(N'Nhanh',N'Giao hàng nhanh 3-5 ngày',15000,5),
(N'Hỏa tốc',N'Giao hàng hỏa tốc 1-2 ngày',30000,2);

-- 15. DonHang
INSERT INTO DonHang 
(maNguoiDung, phiVanChuyen, soNgayDuKien, tongTien, maTrangThai, maPTTT, maPTVC, diaChiGiaoHang, loaiDiaChi)
VALUES
(2,30000,1,150000,1,1,1,N'HCM',N'Nhà');

-- 16. ChiTietDonHang
INSERT INTO ChiTietDonHang (maDonHang, maSanPham, soLuong, gia)
VALUES
(1,1,1,10000),
(1,2,1,20000);

-- 17. GiaoDich
INSERT INTO GiaoDich (loaiGiaoDich, maTrangThai, soTien, momoCode, maDonHang)
VALUES
('PAYMENT',6,150000,'MOMO123',1);

-- 18. DanhGia
INSERT INTO DanhGia (maNguoiDung, maSanPham, soSao, binhLuan)
VALUES
(2,1,5,N'Tốt');

-- 19. PhanHoiDanhGia
INSERT INTO PhanHoiDanhGia (maNguoiDung, tieuDe, noiDung, trangThai, maDanhGia)
VALUES
(1,N'Admin',N'Cảm ơn',N'Hiển thị',1);

-- 20. YeuCauHoanHang
INSERT INTO YeuCauHoanHang (maDonHang, maNguoiDung, lyDo, maTrangThai)
VALUES
(1,2,N'Lỗi sản phẩm',8);