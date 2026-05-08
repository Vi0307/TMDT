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
    maSanPham  NVARCHAR(10)   PRIMARY KEY,                  -- SP01, SP02, ...
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
    maSanPham   NVARCHAR(10) NOT NULL UNIQUE,
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
    maSanPham   NVARCHAR(10)  NOT NULL,
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
    maCTGH    INT          PRIMARY KEY IDENTITY(1,1),
    maGioHang INT          NOT NULL,
    maSanPham NVARCHAR(10) NOT NULL,
    soLuong   INT          NOT NULL,
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
    maSanPham NVARCHAR(10)  NOT NULL,
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
    maSanPham   NVARCHAR(10) NOT NULL,
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
INSERT INTO SanPham (maSanPham, tenSanPham, gia, moTa, maDanhMuc, hinhAnh, trangThai)
VALUES
-- Thủ công mỹ nghệ (maDanhMuc = 1)
('SP01', N'Giỏ mây tre đan',    10000,  N'Giỏ được đan thủ công từ mây và tre tự nhiên bởi các nghệ nhân làng nghề Hội An. Thiết kế chắc chắn, thân thiện môi trường, phù hợp đựng đồ dùng hàng ngày hoặc làm quà tặng ý nghĩa.',  1, 'THUCONGMYNGHE/giomaytredan.webp',    N'Đang bán'),
('SP02', N'Lọ hoa sơn mài',     20000,  N'Lọ hoa được chế tác từ gỗ mít, phủ nhiều lớp sơn mài truyền thống và đánh bóng tỉ mỉ. Họa tiết hoa sen và chim phượng được vẽ tay, mang đậm nét văn hóa phố cổ Hội An.',  1, 'THUCONGMYNGHE/lohoasonmai.jpg',      N'Đang bán'),
('SP03', N'Nón lá Hội An',      30000,  N'Nón lá truyền thống được làm từ lá cọ non phơi khô, khâu tay từng mũi kim trên khung tre. Bên trong có thêu hình ảnh phố cổ Hội An, vừa che nắng vừa là món quà lưu niệm độc đáo.',  1, 'THUCONGMYNGHE/nonlahoian.jpg',       N'Đang bán'),
('SP04', N'Túi xách thổ cẩm',   40000,  N'Túi xách được dệt từ vải thổ cẩm với hoa văn truyền thống của các dân tộc miền Trung. Khung túi chắc chắn, có khóa kéo tiện lợi, phù hợp đi chơi hoặc làm quà tặng bạn bè.',  1, 'THUCONGMYNGHE/tuixachthocam.jpg',    N'Đang bán'),
-- Đặc sản (maDanhMuc = 2)
('SP05', N'Bánh đậu xanh',      50000,  N'Bánh đậu xanh Hội An được làm từ đậu xanh cà vỏ, xay mịn, trộn đường và mỡ heo theo công thức gia truyền. Vị ngọt thanh, tan ngay trong miệng, đóng hộp tiện lợi làm quà biếu.',  2, 'DACSAN/banhdauxanh.jpg',             N'Đang bán'),
('SP06', N'Bánh dừa nướng Hội An', 60000, N'Bánh dừa nướng đặc sản phố Hội, làm từ cơm dừa tươi nạo sợi, trộn đường mía và nướng trên than hoa. Vỏ ngoài giòn rụm, bên trong dẻo thơm mùi dừa, ăn một lần nhớ mãi.', 2, 'DACSAN/banhduanuonghoian.jpg',      N'Đang bán'),
('SP07', N'Bánh tổ Hội An',     70000,  N'Bánh tổ là món ăn truyền thống không thể thiếu trong dịp Tết của người Hội An. Làm từ nếp, đường bát và gừng, bánh có vị ngọt đậm, dẻo dai, thường được chiên giòn trước khi ăn.',  2, 'DACSAN/banhtohoian.jpg',             N'Đang bán'),
('SP08', N'Tương ớt phố Hội',   80000,  N'Tương ớt được làm theo công thức bí truyền của người Hội An, kết hợp ớt đỏ tươi, tỏi, giấm gạo và gia vị đặc biệt. Vị cay nồng, chua nhẹ, thơm tự nhiên, không chất bảo quản.',  2, 'DACSAN/tuongotphohoi.jpg',           N'Đang bán'),
-- Quà lưu niệm (maDanhMuc = 3)
('SP09', N'Đĩa gốm sứ',         90000,  N'Đĩa gốm được làm thủ công tại làng gốm Thanh Hà, nung ở nhiệt độ cao với men tự nhiên. Họa tiết hoa văn truyền thống được vẽ tay từng chiếc, không có hai chiếc nào giống nhau hoàn toàn.',  3, 'QUALUUNIEM/diagomsu.webp',           N'Đang bán'),
('SP10', N'Lồng đèn Hội An',    100000, N'Lồng đèn lụa Hội An được làm từ khung tre già uốn tay và lụa tơ tằm nhuộm màu tự nhiên. Khi thắp sáng tỏa ánh vàng ấm áp, là biểu tượng văn hóa đặc trưng của phố cổ Hội An.',  3, 'QUALUUNIEM/longdenhoian.webp',       N'Đang bán'),
('SP11', N'Nam châm lưu niệm',  110000, N'Nam châm lưu niệm in hình các địa danh nổi tiếng của Hội An như Chùa Cầu, phố đèn lồng, Hội quán Phúc Kiến. Chất liệu nhựa cao cấp, màu sắc sắc nét, gắn được lên tủ lạnh hoặc bảng từ.',  3, 'QUALUUNIEM/namchamluuniem.webp',     N'Đang bán'),
('SP12', N'Tranh sơn dầu Hội An', 120000, N'Tranh sơn dầu vẽ tay phong cảnh phố cổ Hội An về đêm với ánh đèn lồng lung linh phản chiếu trên sông Hoài. Khung gỗ chắc chắn, có thể treo trang trí phòng khách hoặc làm quà tặng cao cấp.', 3, 'QUALUUNIEM/tranhsondauhoian.png', N'Đang bán'),
-- Trang phục (maDanhMuc = 4)
('SP13', N'Áo dài cách tân Hội An',    130000, N'Áo dài cách tân kết hợp giữa dáng áo dài truyền thống và thiết kế hiện đại, may từ vải lụa Hội An cao cấp. Họa tiết hoa văn tinh tế, phù hợp mặc đi chơi, chụp ảnh kỷ niệm tại phố cổ.', 4, 'TRANGPHUC/aodaicachtanhoian.webp',       N'Đang bán'),
('SP14', N'Áo dài Hội An truyền thống', 140000, N'Áo dài truyền thống may theo kiểu dáng cổ điển, sử dụng vải lụa tơ tằm dệt tay với hoa văn thêu tay tinh xảo. Đường may tỉ mỉ, ôm dáng thanh lịch, tôn lên vẻ đẹp dịu dàng của người phụ nữ Việt.', 4, 'TRANGPHUC/aodaihoiantruyenthong.webp', N'Đang bán'),
('SP15', N'Âu phục Hội An',     150000, N'Bộ âu phục may đo theo phong cách Hội An, kết hợp chất liệu vải lanh tự nhiên với đường cắt may hiện đại. Thoáng mát, phù hợp khí hậu nhiệt đới, thích hợp mặc tham quan phố cổ hoặc dự tiệc.',  4, 'TRANGPHUC/auphuchoian.jpg',          N'Đang bán'),
('SP16', N'Vải lụa tơ tằm',     160000, N'Vải lụa tơ tằm nguyên chất được dệt thủ công trên khung cửi truyền thống tại làng lụa Hội An. Sợi tơ mịn mượt, màu sắc bền đẹp từ thuốc nhuộm tự nhiên, có thể may áo dài, khăn quàng hoặc trang trí nội thất.',  4, 'TRANGPHUC/vailuatotam.webp',         N'Đang bán'),
-- Chăm sóc sức khỏe & thư giãn (maDanhMuc = 5)
('SP17', N'Muối tắm dưỡng thể', 170000, N'Muối tắm được pha chế từ muối biển Cửa Đại kết hợp tinh dầu hoa hồng, lavender và chiết xuất thảo mộc tự nhiên. Giúp tẩy tế bào chết, dưỡng ẩm da, thư giãn cơ bắp sau ngày dài mệt mỏi.',  5, 'CHAMSOCSUCKHOEVATHUGIAN/muoitamduongthe.png',  N'Đang bán'),
('SP18', N'Nến thơm đèn ngủ',   180000, N'Nến thơm làm từ sáp đậu nành tự nhiên, tim bấc bằng bông, hương thơm được chiết xuất từ hoa nhài và gỗ đàn hương Hội An. Cháy đều, không khói, tỏa hương nhẹ nhàng giúp thư giãn và dễ ngủ.',  5, 'CHAMSOCSUCKHOEVATHUGIAN/nenthomdengu.jpeg',    N'Đang bán'),
('SP19', N'Trà an thần',        190000, N'Trà thảo mộc an thần được pha chế từ hoa cúc, tâm sen, lá vông nem và các thảo dược quý vùng Quảng Nam. Uống trước khi ngủ giúp thư giãn thần kinh, ngủ sâu giấc, thức dậy tỉnh táo và sảng khoái.',  5, 'CHAMSOCSUCKHOEVATHUGIAN/traanthan.jpg',        N'Đang bán'),
('SP20', N'Trầm hương thơm phòng', 200000, N'Trầm hương tự nhiên khai thác từ rừng Quảng Nam, được chế tác thành que nhang và nụ trầm. Hương thơm thanh khiết, sâu lắng, giúp thanh lọc không khí, xua đuổi muỗi và tạo không gian thư giãn tâm linh.', 5, 'CHAMSOCSUCKHOEVATHUGIAN/tramhuongthomphong.webp', N'Đang bán');

-- 6. ChiTietSanPham
INSERT INTO ChiTietSanPham (maSanPham, soLuongTon, moTa)
VALUES
('SP01',50,N''),('SP02',50,N''),('SP03',50,N''),('SP04',50,N''),
('SP05',50,N''),('SP06',50,N''),('SP07',50,N''),('SP08',50,N''),
('SP09',50,N''),('SP10',50,N''),('SP11',50,N''),('SP12',50,N''),
('SP13',50,N''),('SP14',50,N''),('SP15',50,N''),('SP16',50,N''),
('SP17',50,N''),('SP18',50,N''),('SP19',50,N''),('SP20',50,N'');

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
(1, 'SP01', 50, 8000),
(2, 'SP02', 50, 15000);

-- 10. GioHang
INSERT INTO GioHang (maNguoiDung)
VALUES (2);

-- 11. ChiTietGioHang
INSERT INTO ChiTietGioHang (maGioHang, maSanPham, soLuong)
VALUES
(1, 'SP01', 2),
(1, 'SP02', 1);

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
(1, 'SP01', 1, 10000),
(1, 'SP02', 1, 20000);

-- 17. GiaoDich (maTrangThai=6 = 'Thành công' loại PAYMENT)
INSERT INTO GiaoDich (loaiGiaoDich, maTrangThai, soTien, momoCode, maDonHang)
VALUES
('PAYMENT', 6, 45000, 'MOMO123', 1);

-- 18. DanhGia
INSERT INTO DanhGia (maNguoiDung, maSanPham, soSao, binhLuan)
VALUES
(2, 'SP01', 5, N'Sản phẩm tốt, giao hàng nhanh');

-- 19. PhanHoiDanhGia
INSERT INTO PhanHoiDanhGia (maNguoiDung, tieuDe, noiDung, trangThai, maDanhGia)
VALUES
(1, N'Phản hồi từ Shop', N'Cảm ơn bạn đã tin tưởng mua hàng!', N'Hiển thị', 1);

-- 20. YeuCauHoanHang (maTrangThai=8 = 'Chờ duyệt hoàn' loại RETURN)
INSERT INTO YeuCauHoanHang (maDonHang, maNguoiDung, lyDo, maTrangThai)
VALUES
(1, 2, N'Sản phẩm bị lỗi khi nhận hàng', 8);

GO