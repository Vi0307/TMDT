-- ========================================
-- CREATE DATABASE
-- ========================================
USE master;
GO

IF DB_ID('ecommerce_detai3') IS NOT NULL
BEGIN
    -- Ngắt tất cả kết nối đang dùng DB
    ALTER DATABASE ecommerce_detai3 SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE ecommerce_detai3;
END
GO

-- Sau đó tạo mới bình thường
CREATE DATABASE ecommerce_detai3;
GO

USE ecommerce_detai3;
GO

-- ========================================
-- 1. NguoiDung
-- ========================================
CREATE TABLE NguoiDung (
    maNguoiDung  INT          PRIMARY KEY IDENTITY(1,1),
    ten          NVARCHAR(100) NOT NULL,
    email        NVARCHAR(100) NOT NULL UNIQUE,
    matKhau      NVARCHAR(255) NOT NULL,
    soDienThoai  NVARCHAR(20)  UNIQUE,
    diaChi       NVARCHAR(255),
    vaiTro       NVARCHAR(50)  NOT NULL DEFAULT 'USER',
    trangThai    NVARCHAR(50)  NOT NULL DEFAULT N'Hoạt động',  -- Hoạt động / Bị khóa
    ngayTao      DATETIME      NOT NULL DEFAULT GETDATE(),
    CHECK (vaiTro IN ('ADMIN', 'USER')),
    CHECK (trangThai IN (N'Hoạt động', N'Bị khóa'))
);

-- ========================================
-- 2. Ví điện tử
-- ========================================
CREATE TABLE ViDienTu (
    maVi         INT           PRIMARY KEY IDENTITY(1,1),
    maNguoiDung  INT           NOT NULL UNIQUE,             -- 1 user 1 ví
    soDu         DECIMAL(10,2) NOT NULL DEFAULT 0,
    trangThai    NVARCHAR(50)  NOT NULL DEFAULT N'Hoạt động',
    CHECK (soDu >= 0),
    CHECK (trangThai IN (N'Hoạt động', N'Bị khóa')),
    FOREIGN KEY (maNguoiDung) REFERENCES NguoiDung(maNguoiDung)
);

-- ========================================
-- 3. OTP
-- ========================================
CREATE TABLE OTP (
    maOtp          INT          PRIMARY KEY IDENTITY(1,1),
    maNguoiDung    INT          NOT NULL,
    maXacThuc      NVARCHAR(10) NOT NULL,
    thoiGianHetHan DATETIME     NOT NULL,
    ngayTao        DATETIME     NOT NULL DEFAULT GETDATE(),
    loai           NVARCHAR(50) NOT NULL,
    trangThai      NVARCHAR(50) NOT NULL DEFAULT 'unused',
    CHECK (loai     IN ('PAYMENT', 'RESET_PASSWORD')),
    CHECK (trangThai IN ('used', 'unused')),
    FOREIGN KEY (maNguoiDung) REFERENCES NguoiDung(maNguoiDung)
);

-- ========================================
-- 4. DanhMuc
-- ========================================
CREATE TABLE DanhMuc (
    maDanhMuc  INT           PRIMARY KEY IDENTITY(1,1),
    tenDanhMuc NVARCHAR(100) NOT NULL
);

-- ========================================
-- 5. SanPham
-- ========================================
CREATE TABLE SanPham (
    maSanPham  INT            PRIMARY KEY IDENTITY(1,1),
    tenSanPham NVARCHAR(100)  NOT NULL,
    gia        DECIMAL(10,2)  NOT NULL,
    moTa       NVARCHAR(MAX),
    maDanhMuc  INT,
    hinhAnh    NVARCHAR(255),
    trangThai  NVARCHAR(50)   NOT NULL DEFAULT N'Đang bán',  -- Đang bán / Ngừng bán
    CHECK (gia > 0),
    CHECK (trangThai IN (N'Đang bán', N'Ngừng bán')),
    FOREIGN KEY (maDanhMuc) REFERENCES DanhMuc(maDanhMuc)
);

-- ========================================
-- 6. ChiTietSanPham (quan hệ 1-1 với SanPham)
-- ========================================
CREATE TABLE ChiTietSanPham (
    maChiTiet   INT          PRIMARY KEY IDENTITY(1,1),
    maSanPham   INT          NOT NULL UNIQUE,
    soLuongTon  INT          NOT NULL DEFAULT 0,
    moTa        NVARCHAR(MAX),
    CHECK (soLuongTon >= 0),
    FOREIGN KEY (maSanPham) REFERENCES SanPham(maSanPham)
);

-- ========================================
-- 7. Nhà cung cấp
-- ========================================
CREATE TABLE NhaCungCap (
    maNCC           INT           PRIMARY KEY IDENTITY(1,1),
    tenNCC          NVARCHAR(100) NOT NULL,
    email           NVARCHAR(100),
    soDienThoai     NVARCHAR(20),
    diaChi          NVARCHAR(255)
);

-- ========================================
-- 8. Phiếu nhập
-- ========================================
CREATE TABLE PhieuNhap (
    maPhieuNhap  INT  PRIMARY KEY IDENTITY(1,1),
    maNCC        INT  NOT NULL,
    maNguoiTao   INT  NOT NULL,                             -- Admin tạo phiếu
    ngayNhap     DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    tongTien     DECIMAL(10,2) NOT NULL DEFAULT 0,
    ghiChu       NVARCHAR(255),
    CHECK (tongTien >= 0),
    FOREIGN KEY (maNCC)      REFERENCES NhaCungCap(maNCC),
    FOREIGN KEY (maNguoiTao) REFERENCES NguoiDung(maNguoiDung)
);

-- ========================================
-- 9. Chi tiết phiếu nhập
-- ========================================
CREATE TABLE ChiTietPhieuNhap (
    maPhieuNhap INT           NOT NULL,
    maSanPham   INT           NOT NULL,
    soLuong     INT           NOT NULL,
    giaNhap     DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (maPhieuNhap, maSanPham),
    CHECK (soLuong > 0),
    CHECK (giaNhap > 0),
    FOREIGN KEY (maPhieuNhap) REFERENCES PhieuNhap(maPhieuNhap),
    FOREIGN KEY (maSanPham)   REFERENCES SanPham(maSanPham)
);

-- ========================================
-- 10. Giỏ hàng (1 user - 1 giỏ)
-- ========================================
CREATE TABLE GioHang (
    maGioHang   INT PRIMARY KEY IDENTITY(1,1),
    maNguoiDung INT NOT NULL UNIQUE,
    FOREIGN KEY (maNguoiDung) REFERENCES NguoiDung(maNguoiDung)
);

-- ========================================
-- 11. Chi tiết giỏ hàng
-- ========================================
CREATE TABLE ChiTietGioHang (
    maCTGH    INT PRIMARY KEY IDENTITY(1,1),
    maGioHang INT NOT NULL,
    maSanPham INT NOT NULL,
    soLuong   INT NOT NULL,
    UNIQUE (maGioHang, maSanPham),                         -- không trùng sp trong 1 giỏ
    CHECK (soLuong > 0),
    FOREIGN KEY (maGioHang) REFERENCES GioHang(maGioHang),
    FOREIGN KEY (maSanPham) REFERENCES SanPham(maSanPham)
);

-- ========================================
-- 12. Trạng thái (dùng chung ORDER / PAYMENT / RETURN)
-- ========================================
CREATE TABLE TrangThai (
    maTrangThai INT           PRIMARY KEY IDENTITY(1,1),
    tenTrangThai NVARCHAR(100) NOT NULL,
    moTa         NVARCHAR(MAX),
    loai         NVARCHAR(50)  NOT NULL,
    CHECK (loai IN ('ORDER', 'PAYMENT', 'RETURN'))
);

-- ========================================
-- 13. Phương thức thanh toán
-- ========================================
CREATE TABLE PhuongThucThanhToan (
    maPTTT    INT          PRIMARY KEY IDENTITY(1,1),
    phuongThuc NVARCHAR(50) NOT NULL UNIQUE
);

-- ========================================
-- 14. Phương thức vận chuyển
-- ========================================
CREATE TABLE PhuongThucVanChuyen (
    maPTVC        INT            PRIMARY KEY IDENTITY(1,1),
    tenPTVC       NVARCHAR(100)  NOT NULL,
    moTa          NVARCHAR(MAX),
    phiVanChuyen  DECIMAL(10,2)  NOT NULL,
    soNgayDuKien  INT            NOT NULL,
    CHECK (phiVanChuyen >= 0),
    CHECK (soNgayDuKien > 0)
);

-- ========================================
-- 15. Đơn hàng
-- FIX: bỏ soNgayDuKien (lấy từ PTVC), sửa computed column
-- FIX: phiVanChuyen copy từ PTVC lúc đặt hàng (snapshot giá)
-- ========================================
CREATE TABLE DonHang (
    maDonHang       INT            PRIMARY KEY IDENTITY(1,1),
    maNguoiDung     INT            NOT NULL,
    phiVanChuyen    DECIMAL(10,2)  NOT NULL,               -- snapshot phí lúc đặt
    soNgayDuKien    INT            NOT NULL,               -- snapshot số ngày lúc đặt
    tongTien        DECIMAL(10,2)  NOT NULL,
    maTrangThai     INT            NOT NULL,
    maPTTT          INT            NOT NULL,
    maPTVC          INT            NOT NULL,
    loaiDiaChi      NVARCHAR(50),
    diaChiGiaoHang  NVARCHAR(255)  NOT NULL,
    ngayDat         DATETIME       NOT NULL DEFAULT GETDATE(),
    ngayXacNhan     DATETIME,
    ngayDuKienGiao  AS DATEADD(DAY, soNgayDuKien, ngayDat) PERSISTED,
    ngayGiaoHang    DATETIME,
    ngayHoanThanh   DATETIME,
    ngayHuy         DATETIME,
    lyDoHuy         NVARCHAR(255),
    CHECK (phiVanChuyen >= 0),
    CHECK (tongTien > 0),
    CHECK (soNgayDuKien > 0),
    FOREIGN KEY (maNguoiDung) REFERENCES NguoiDung(maNguoiDung),
    FOREIGN KEY (maTrangThai) REFERENCES TrangThai(maTrangThai),
    FOREIGN KEY (maPTTT)      REFERENCES PhuongThucThanhToan(maPTTT),
    FOREIGN KEY (maPTVC)      REFERENCES PhuongThucVanChuyen(maPTVC)
);

-- ========================================
-- 16. Chi tiết đơn hàng
-- ========================================
CREATE TABLE ChiTietDonHang (
    maDonHang INT           NOT NULL,
    maSanPham INT           NOT NULL,
    soLuong   INT           NOT NULL,
    gia       DECIMAL(10,2) NOT NULL,                      -- snapshot giá lúc mua
    PRIMARY KEY (maDonHang, maSanPham),
    CHECK (soLuong > 0),
    CHECK (gia > 0),
    FOREIGN KEY (maDonHang) REFERENCES DonHang(maDonHang),
    FOREIGN KEY (maSanPham) REFERENCES SanPham(maSanPham)
);

-- ========================================
-- 17. Giao dịch thanh toán
-- ========================================
CREATE TABLE GiaoDich (
    maGiaoDich   INT            PRIMARY KEY IDENTITY(1,1),
    loaiGiaoDich NVARCHAR(50)   NOT NULL,
    thoiGian     DATETIME       NOT NULL DEFAULT GETDATE(),
    maTrangThai  INT            NOT NULL,
    soTien       DECIMAL(10,2)  NOT NULL,
    momoCode     NVARCHAR(100),
    maDonHang    INT            NOT NULL,
    CHECK (loaiGiaoDich IN ('PAYMENT', 'REFUND')),
    CHECK (soTien > 0),
    FOREIGN KEY (maTrangThai) REFERENCES TrangThai(maTrangThai),
    FOREIGN KEY (maDonHang)   REFERENCES DonHang(maDonHang)
);

-- ========================================
-- 18. Đánh giá sản phẩm
-- ========================================
CREATE TABLE DanhGia (
    maDanhGia   INT          PRIMARY KEY IDENTITY(1,1),
    maNguoiDung INT          NOT NULL,
    maSanPham   INT          NOT NULL,
    soSao       INT          NOT NULL,
    binhLuan    NVARCHAR(MAX),
    ngayDanhGia DATETIME     NOT NULL DEFAULT GETDATE(),
    UNIQUE (maNguoiDung, maSanPham),                      -- 1 user chỉ đánh giá 1 lần/sp
    CHECK (soSao BETWEEN 1 AND 5),
    FOREIGN KEY (maNguoiDung) REFERENCES NguoiDung(maNguoiDung),
    FOREIGN KEY (maSanPham)   REFERENCES SanPham(maSanPham)
);

-- ========================================
-- 19. Phản hồi đánh giá (admin reply)
-- ========================================
CREATE TABLE PhanHoiDanhGia (
    maPhanHoi   INT           PRIMARY KEY IDENTITY(1,1),
    maNguoiDung INT           NOT NULL,
    tieuDe      NVARCHAR(100),
    noiDung     NVARCHAR(MAX) NOT NULL,
    trangThai   NVARCHAR(50)  NOT NULL DEFAULT N'Hiển thị',
    ngayTao     DATETIME      NOT NULL DEFAULT GETDATE(),
    maDanhGia   INT           NOT NULL,
    CHECK (trangThai IN (N'Hiển thị', N'Ẩn')),
    FOREIGN KEY (maNguoiDung) REFERENCES NguoiDung(maNguoiDung),
    FOREIGN KEY (maDanhGia)   REFERENCES DanhGia(maDanhGia)
);

-- ========================================
-- 20. Yêu cầu hoàn hàng
-- ========================================
CREATE TABLE YeuCauHoanHang (
    maYeuCau    INT          PRIMARY KEY IDENTITY(1,1),
    maDonHang   INT          NOT NULL,
    maNguoiDung INT          NOT NULL,
    ngayYeuCau  DATETIME     NOT NULL DEFAULT GETDATE(),
    lyDo        NVARCHAR(255) NOT NULL,
    maTrangThai INT          NOT NULL,
    ngayXuLy    DATETIME,
    ghiChu      NVARCHAR(255),
    FOREIGN KEY (maDonHang)   REFERENCES DonHang(maDonHang),
    FOREIGN KEY (maNguoiDung) REFERENCES NguoiDung(maNguoiDung),
    FOREIGN KEY (maTrangThai) REFERENCES TrangThai(maTrangThai)
);

GO

-- ========================================
-- INSERT DỮ LIỆU MẪU
-- ========================================

-- 1. NguoiDung
INSERT INTO NguoiDung (ten, email, matKhau, soDienThoai, diaChi, vaiTro, trangThai)
VALUES 
(N'Admin',        'admin@gmail.com',      '123456', '0900000001', N'Hà Nội', 'ADMIN', N'Hoạt động'),
(N'Nguyen Van A', 'haip59621@gmail.com',  '123456', '0900000002', N'HCM',    'USER',  N'Hoạt động');

-- 2. ViDienTu
INSERT INTO ViDienTu (maNguoiDung, soDu, trangThai)
VALUES
(1, 1000000, N'Hoạt động'),
(2, 500000,  N'Hoạt động');

-- 3. OTP
INSERT INTO OTP (maNguoiDung, maXacThuc, thoiGianHetHan, loai, trangThai)
VALUES
(2, '123456', DATEADD(MINUTE, 5, GETDATE()), 'PAYMENT',        'unused'),
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
INSERT INTO SanPham (tenSanPham, gia, moTa, maDanhMuc, trangThai)
VALUES
(N'SP1', 10000, N'Mô tả SP1', 1, N'Đang bán'),
(N'SP2', 20000, N'Mô tả SP2', 1, N'Đang bán'),
(N'SP3', 30000, N'Mô tả SP3', 1, N'Đang bán'),
(N'SP4', 40000, N'Mô tả SP4', 1, N'Đang bán'),
(N'SP5', 50000, N'Mô tả SP5', 2, N'Đang bán'),
(N'SP6', 60000, N'Mô tả SP6', 2, N'Đang bán'),
(N'SP7', 70000, N'Mô tả SP7', 2, N'Đang bán'),
(N'SP8', 80000, N'Mô tả SP8', 2, N'Đang bán'),
(N'SP9', 90000,  N'Mô tả SP9',  3, N'Đang bán'),
(N'SP10',100000, N'Mô tả SP10', 3, N'Đang bán'),
(N'SP11',110000, N'Mô tả SP11', 3, N'Đang bán'),
(N'SP12',120000, N'Mô tả SP12', 3, N'Đang bán'),
(N'SP13',130000, N'Mô tả SP13', 4, N'Đang bán'),
(N'SP14',140000, N'Mô tả SP14', 4, N'Đang bán'),
(N'SP15',150000, N'Mô tả SP15', 4, N'Đang bán'),
(N'SP16',160000, N'Mô tả SP16', 4, N'Đang bán'),
(N'SP17',170000, N'Mô tả SP17', 5, N'Đang bán'),
(N'SP18',180000, N'Mô tả SP18', 5, N'Đang bán'),
(N'SP19',190000, N'Mô tả SP19', 5, N'Đang bán'),
(N'SP20',200000, N'Mô tả SP20', 5, N'Đang bán');

-- 6. ChiTietSanPham
INSERT INTO ChiTietSanPham (maSanPham, soLuongTon, moTa)
VALUES
( 1,50,N''),( 2,50,N''),( 3,50,N''),( 4,50,N''),
( 5,50,N''),( 6,50,N''),( 7,50,N''),( 8,50,N''),
( 9,50,N''),(10,50,N''),(11,50,N''),(12,50,N''),
(13,50,N''),(14,50,N''),(15,50,N''),(16,50,N''),
(17,50,N''),(18,50,N''),(19,50,N''),(20,50,N'');

-- 7. NhaCungCap
INSERT INTO NhaCungCap (tenNCC, email, soDienThoai, diaChi)
VALUES
(N'NCC A', 'ncca@gmail.com', '0911000001', N'Hà Nội'),
(N'NCC B', 'nccb@gmail.com', '0911000002', N'HCM');

-- 8. PhieuNhap (maNguoiTao = 1 là Admin)
INSERT INTO PhieuNhap (maNCC, maNguoiTao, ngayNhap, tongTien, ghiChu)
VALUES
(1, 1, CAST(GETDATE() AS DATE), 400000, N'Nhập hàng lần 1'),
(2, 1, CAST(GETDATE() AS DATE), 750000, N'Nhập hàng lần 2');

-- 9. ChiTietPhieuNhap
INSERT INTO ChiTietPhieuNhap (maPhieuNhap, maSanPham, soLuong, giaNhap)
VALUES
(1, 1, 50, 8000),
(2, 2, 50, 15000);

-- 10. GioHang
INSERT INTO GioHang (maNguoiDung)
VALUES (2);

-- 11. ChiTietGioHang
INSERT INTO ChiTietGioHang (maGioHang, maSanPham, soLuong)
VALUES
(1, 1, 2),
(1, 2, 1);

-- 12. TrangThai
INSERT INTO TrangThai (tenTrangThai, moTa, loai)
VALUES
-- ORDER (ID 1-4)
(N'Chờ xác nhận', N'Đơn hàng chờ admin xác nhận',   'ORDER'),
(N'Đang giao',    N'Đơn hàng đang được vận chuyển',  'ORDER'),
(N'Đã giao',      N'Đơn hàng đã giao thành công',    'ORDER'),
(N'Đã hủy',       N'Đơn hàng đã bị hủy',             'ORDER'),

-- PAYMENT (ID 5-7)
(N'Chờ thanh toán', N'Giao dịch chờ xử lý',   'PAYMENT'),
(N'Thành công',     N'Giao dịch thành công',   'PAYMENT'),
(N'Đã hoàn tiền',   N'Tiền đã được hoàn lại',  'PAYMENT'),

-- RETURN (ID 8-10)
(N'Chờ duyệt hoàn', N'Yêu cầu hoàn chờ duyệt', 'RETURN'),
(N'Đã duyệt hoàn',  N'Yêu cầu hoàn được duyệt', 'RETURN'),
(N'Từ chối hoàn',   N'Yêu cầu hoàn bị từ chối', 'RETURN');

-- 13. PhuongThucThanhToan
INSERT INTO PhuongThucThanhToan (phuongThuc)
VALUES
(N'MOMO'),
(N'COD');

-- 14. PhuongThucVanChuyen
INSERT INTO PhuongThucVanChuyen (tenPTVC, moTa, phiVanChuyen, soNgayDuKien)
VALUES
(N'Nhanh',    N'Giao hàng nhanh 3-5 ngày',      15000, 5),
(N'Hỏa tốc', N'Giao hàng hỏa tốc 1-2 ngày',    30000, 2);

-- 15. DonHang
-- FIX: phiVanChuyen = 15000 (đúng với maPTVC=1), soNgayDuKien = 5 (copy từ PTVC)
INSERT INTO DonHang 
    (maNguoiDung, phiVanChuyen, soNgayDuKien, tongTien,
     maTrangThai, maPTTT, maPTVC, diaChiGiaoHang, loaiDiaChi)
VALUES
    (2, 15000, 5, 45000, 1, 1, 1, N'123 Lê Lợi, HCM', N'Nhà');
-- tongTien = SP1(10000) + SP2(20000) + phiVC(15000) = 45000

-- 16. ChiTietDonHang
INSERT INTO ChiTietDonHang (maDonHang, maSanPham, soLuong, gia)
VALUES
(1, 1, 1, 10000),
(1, 2, 1, 20000);

-- 17. GiaoDich (maTrangThai=6 = 'Thành công' loại PAYMENT)
INSERT INTO GiaoDich (loaiGiaoDich, maTrangThai, soTien, momoCode, maDonHang)
VALUES
('PAYMENT', 6, 45000, 'MOMO123', 1);

-- 18. DanhGia
INSERT INTO DanhGia (maNguoiDung, maSanPham, soSao, binhLuan)
VALUES
(2, 1, 5, N'Sản phẩm tốt, giao hàng nhanh');

-- 19. PhanHoiDanhGia
INSERT INTO PhanHoiDanhGia (maNguoiDung, tieuDe, noiDung, trangThai, maDanhGia)
VALUES
(1, N'Phản hồi từ Shop', N'Cảm ơn bạn đã tin tưởng mua hàng!', N'Hiển thị', 1);

-- 20. YeuCauHoanHang (maTrangThai=8 = 'Chờ duyệt hoàn' loại RETURN)
INSERT INTO YeuCauHoanHang (maDonHang, maNguoiDung, lyDo, maTrangThai)
VALUES
(1, 2, N'Sản phẩm bị lỗi khi nhận hàng', 8);

GO