-- SQL Script to update column names to Vietnamese
-- This script updates column names for key entities to Vietnamese names
-- Execute with caution: Backup your database first!

-- Update Users table columns
ALTER TABLE "AspNetUsers" 
RENAME COLUMN "FullName" TO "HoVaTen",
RENAME COLUMN "AvatarUrl" TO "UrlHinhAnh",
RENAME COLUMN "LastLoginAt" TO "ThoiGianDangNhapCuoi",
RENAME COLUMN "LastLoginIp" TO "DiaChiIpDangNhap",
RENAME COLUMN "ForcePasswordChange" TO "BatBuocDoiMatKhau",
RENAME COLUMN "PasswordChangedAt" TO "ThoiGianDoiMatKhau",
RENAME COLUMN "PreferredLanguage" TO "NgonNguThichNghien",
RENAME COLUMN "TimeZone" TO "KhuVuiThoiGian",
RENAME COLUMN "PhoneNumberVerified" TO "SoDienThoaiDaXacThuc",
RENAME COLUMN "EmailVerifiedAt" TO "ThoiGianXacThucEmail",
RENAME COLUMN "PhoneNumberVerifiedAt" TO "ThoiGianXacThucSoDienThoai";

-- Update UserProfiles table columns
ALTER TABLE "UserProfiles" 
RENAME COLUMN "Gender" TO "GioiTinh",
RENAME COLUMN "DateOfBirth" TO "NgaySinh",
RENAME COLUMN "NationalId" TO "SoCMTCCCD",
RENAME COLUMN "Address" TO "DiaChiChiTiet",
RENAME COLUMN "City" TO "ThanhPho",
RENAME COLUMN "District" TO "QuanHuyen",
RENAME COLUMN "Ward" TO "PhuongXa",
RENAME COLUMN "PostalCode" TO "MaBuuDien",
RENAME COLUMN "CompanyName" TO "TenCongTy",
RENAME COLUMN "TaxCode" TO "MaSoThue",
RENAME COLUMN "BusinessType" TO "LoaiHinhDoanhNghiep",
RENAME COLUMN "CreatedAt" TO "NgayTao",
RENAME COLUMN "UpdatedAt" TO "NgayCapNhat",
RENAME COLUMN "CustomerType" TO "LoaiKhachHang";

-- Update CustomerAddresses table columns
ALTER TABLE "CustomerAddresses" 
RENAME COLUMN "RecipientName" TO "NguoiNhan",
RENAME COLUMN "PhoneNumber" TO "SoDienThoai",
RENAME COLUMN "AddressLine" TO "DiaChiChiTiet",
RENAME COLUMN "City" TO "ThanhPho",
RENAME COLUMN "District" TO "QuanHuyen",
RENAME COLUMN "Ward" TO "PhuongXa",
RENAME COLUMN "PostalCode" TO "MaBuuDien",
RENAME COLUMN "AddressLabel" TO "NhanDiaChi",
RENAME COLUMN "CreatedAt" TO "NgayTao",
RENAME COLUMN "UpdatedAt" TO "NgayCapNhat";

-- Update Products table columns
ALTER TABLE "Products" 
RENAME COLUMN "Name" TO "TenSanPham",
RENAME COLUMN "Sku" TO "MaSanPham",
RENAME COLUMN "Price" TO "GiaBan",
RENAME COLUMN "OldPrice" TO "GiaCu",
RENAME COLUMN "CostPrice" TO "GiaVon",
RENAME COLUMN "Description" TO "MoTa",
RENAME COLUMN "Specifications" TO "ThongSoKyThuat",
RENAME COLUMN "WarrantyInfo" TO "ThongTinBaoHanh",
RENAME COLUMN "StockQuantity" TO "SoLuongTon",
RENAME COLUMN "Barcode" TO "MaVach",
RENAME COLUMN "Weight" TO "KhoiLuong",
RENAME COLUMN "ImageUrl" TO "UrlHinhAnh",
RENAME COLUMN "GalleryImages" TO "HinhAnhThuVien",
RENAME COLUMN "StockLocations" TO "ViTriTonKho",
RENAME COLUMN "ViewCount" TO "LuotXem",
RENAME COLUMN "SoldCount" TO "SoLuongBan",
RENAME COLUMN "AverageRating" TO "DanhGiaTrungBinh",
RENAME COLUMN "ReviewCount" TO "SoLuongDanhGia",
RENAME COLUMN "PublishedAt" TO "NgayDang",
RENAME COLUMN "DiscontinuedAt" TO "NgayNgungBan",
RENAME COLUMN "LowStockThreshold" TO "NguongThongBao",
RENAME COLUMN "MetaTitle" TO "TieuDeMeta",
RENAME COLUMN "MetaDescription" TO "MoTaMeta",
RENAME COLUMN "MetaKeywords" TO "TuKhoaMeta",
RENAME COLUMN "CanonicalUrl" TO "UrlChuan",
RENAME COLUMN "CreatedByUserId" TO "IdNguoiDungTao",
RENAME COLUMN "UpdatedByUserId" TO "IdNguoiDungCapNhat";

-- Update Orders table columns
ALTER TABLE "Orders" 
RENAME COLUMN "OrderNumber" TO "SoDonHang",
RENAME COLUMN "CustomerId" TO "IdKhachHang",
RENAME COLUMN "ShippingAddress" TO "DiaChiGiaoHang",
RENAME COLUMN "Notes" TO "GhiChu",
RENAME COLUMN "CustomerIp" TO "IpKhachHang",
RENAME COLUMN "CustomerUserAgent" TO "UserAgentKhachHang",
RENAME COLUMN "InternalNotes" TO "GhiChuNoiBo",
RENAME COLUMN "SourceId" TO "IdNguon",
RENAME COLUMN "AffiliateId" TO "IdDaiLy",
RENAME COLUMN "DiscountReason" TO "LyDoGiamGia",
RENAME COLUMN "DeliveryTrackingNumber" TO "MaTheoDoiVanChuyen",
RENAME COLUMN "DeliveryCarrier" TO "NhaVanChuyen",
RENAME COLUMN "RetryCount" TO "SoLaiThu",
RENAME COLUMN "FailureReason" TO "LyDoThatBai",
RENAME COLUMN "OrderDate" TO "NgayDat",
RENAME COLUMN "ConfirmedAt" TO "NgayXacNhan",
RENAME COLUMN "ShippedAt" TO "NgayGiao",
RENAME COLUMN "DeliveredAt" TO "NgayNhan",
RENAME COLUMN "PaidAt" TO "NgayThanhToan",
RENAME COLUMN "FulfilledAt" TO "NgayHoanThanh",
RENAME COLUMN "CompletedAt" TO "NgayHoanTat",
RENAME COLUMN "CancelledAt" TO "NgayHuy",
RENAME COLUMN "CancellationReason" TO "LyDoHuy",
RENAME COLUMN "SubtotalAmount" TO "TongTienHang",
RENAME COLUMN "DiscountAmount" TO "TienGiamGia",
RENAME COLUMN "TaxAmount" TO "Thue",
RENAME COLUMN "ShippingAmount" TO "PhiVanChuyen",
RENAME COLUMN "TotalAmount" TO "TongThanhToan",
RENAME COLUMN "TaxRate" TO "ThueSuat",
RENAME COLUMN "CouponCode" TO "MaCoupon",
RENAME COLUMN "CouponSnapshot" TO "ThongTinCoupon";

-- Update OrderItems table columns
ALTER TABLE "OrderItems" 
RENAME COLUMN "OrderId" TO "IdDonHang",
RENAME COLUMN "ProductId" TO "IdSanPham",
RENAME COLUMN "ProductName" TO "TenSanPham",
RENAME COLUMN "ProductSku" TO "MaSanPham",
RENAME COLUMN "UnitPrice" TO "GiaDonVi",
RENAME COLUMN "OriginalPrice" TO "GiaGoc",
RENAME COLUMN "Quantity" TO "SoLuong",
RENAME COLUMN "DiscountAmount" TO "TienGiamGia",
RENAME COLUMN "LineTotal" TO "TongTienDong";

-- Update Product Categories
ALTER TABLE "Categories" 
RENAME COLUMN "Name" TO "TenDanhMuc",
RENAME COLUMN "Description" TO "MoTa",
RENAME COLUMN "ParentId" TO "IdDanhMucCha",
RENAME COLUMN "IsActive" TO "HoatDong",
RENAME COLUMN "DisplayOrder" TO "ThuTuHienThi",
RENAME COLUMN "CreatedAt" TO "NgayTao",
RENAME COLUMN "UpdatedAt" TO "NgayCapNhat",
RENAME COLUMN "CreatedByUserId" TO "IdNguoiDungTao",
RENAME COLUMN "UpdatedByUserId" TO "IdNguoiDungCapNhat";

-- Update Brands
ALTER TABLE "Brands" 
RENAME COLUMN "Name" TO "ThuongHieu",
RENAME COLUMN "Description" TO "MoTa",
RENAME COLUMN "LogoUrl" TO "UrlLogo",
RENAME COLUMN "Website" TO "Website",
RENAME COLUMN "IsActive" TO "HoatDong",
RENAME COLUMN "DisplayOrder" TO "ThuTuHienThi",
RENAME COLUMN "CreatedAt" TO "NgayTao",
RENAME COLUMN "UpdatedAt" TO "NgayCapNhat",
RENAME COLUMN "CreatedByUserId" TO "IdNguoiDungTao",
RENAME COLUMN "UpdatedByUserId" TO "IdNguoiDungCapNhat";

-- Update Inventories
ALTER TABLE "InventoryItems" 
RENAME COLUMN "ProductId" TO "IdSanPham",
RENAME COLUMN "Quantity" TO "SoLuong",
RENAME COLUMN "MinQuantity" TO "SoLuongToiThieu",
RENAME COLUMN "MaxQuantity" TO "SoLuongToiDa",
RENAME COLUMN "ReorderLevel" TO "MucDatHangLai",
RENAME COLUMN "Location" TO "ViTri",
RENAME COLUMN "BatchNumber" TO "SoLô",
RENAME COLUMN "ExpiryDate" TO "HanSuDung",
RENAME COLUMN "LastUpdated" TO "NgayCapNhat";

-- Update Coupons
ALTER TABLE "Coupons" 
RENAME COLUMN "Code" TO "MaCoupon",
RENAME COLUMN "Name" TO "TenCoupon",
RENAME COLUMN "Description" TO "MoTa",
RENAME COLUMN "DiscountType" TO "LoaiGiamGia",
RENAME COLUMN "DiscountValue" TO "GiaTriGiam",
RENAME COLUMN "MinOrderAmount" TO "GiaTriDonHangToiThieu",
RENAME COLUMN "MaxDiscountAmount" TO "GiaTriGiamToiDa",
RENAME COLUMN "ValidFrom" TO "NgayBatDau",
RENAME COLUMN "ValidTo" TO "NgayKetThuc",
RENAME COLUMN "UsageLimit" TO "SoLanSuDungToiDa",
RENAME COLUMN "UsedCount" TO "SoLanDaSuDung",
RENAME COLUMN "IsActive" TO "HoatDong",
RENAME COLUMN "AppliesToAllProducts" TO "UngChoTatCaSanPham";

-- Update Reports
ALTER TABLE "Reports" 
RENAME COLUMN "Title" TO "TieuDe",
RENAME COLUMN "Description" TO "MoTa",
RENAME COLUMN "Type" TO "LoaiBaoCao",
RENAME COLUMN "Data" TO "DuLieu",
RENAME COLUMN "GeneratedAt" TO "ThoiGianTao",
RENAME COLUMN "GeneratedByUserId" TO "IdNguoiDungTao";

-- Print completion message
-- \echo 'Column names have been updated to Vietnamese'

-- Note: This script assumes PostgreSQL syntax. For other databases, 
-- you may need to adjust the syntax accordingly.