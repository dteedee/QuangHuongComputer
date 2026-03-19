-- Script thêm sản phẩm cho QuangHuongComputer
-- Chạy script này để thêm nhiều sản phẩm vào database

-- Lấy ID của categories và brands
DO $$
DECLARE
    cat_component UUID;
    cat_laptop UUID;
    cat_screen UUID;
    cat_gear UUID;
    cat_camera UUID;
    cat_audio UUID;
    cat_network UUID;
    cat_accessories UUID;
    
    brand_intel UUID;
    brand_amd UUID;
    brand_nvidia UUID;
    brand_corsair UUID;
    brand_kingston UUID;
    brand_asus UUID;
    brand_msi UUID;
    brand_gigabyte UUID;
    brand_logitech UUID;
    brand_razer UUID;
BEGIN
    -- Lấy category IDs
    SELECT "Id" INTO cat_component FROM "Categories" WHERE "Description" = 'components' LIMIT 1;
    SELECT "Id" INTO cat_laptop FROM "Categories" WHERE "Description" = 'laptop' LIMIT 1;
    SELECT "Id" INTO cat_screen FROM "Categories" WHERE "Description" = 'screens' LIMIT 1;
    SELECT "Id" INTO cat_gear FROM "Categories" WHERE "Description" = 'gear' LIMIT 1;
    SELECT "Id" INTO cat_camera FROM "Categories" WHERE "Description" = 'camera' LIMIT 1;
    SELECT "Id" INTO cat_audio FROM "Categories" WHERE "Description" = 'audio' LIMIT 1;
    SELECT "Id" INTO cat_network FROM "Categories" WHERE "Description" = 'network' LIMIT 1;
    SELECT "Id" INTO cat_accessories FROM "Categories" WHERE "Description" = 'accessories' LIMIT 1;
    
    -- Thêm brands mới nếu chưa có
    INSERT INTO "Brands" ("Id", "Name", "Description", "IsActive", "CreatedAt", "UpdatedAt")
    VALUES 
        (gen_random_uuid(), 'Intel', 'Intel Corporation', true, NOW(), NOW()),
        (gen_random_uuid(), 'AMD', 'Advanced Micro Devices', true, NOW(), NOW()),
        (gen_random_uuid(), 'NVIDIA', 'NVIDIA Corporation', true, NOW(), NOW()),
        (gen_random_uuid(), 'Corsair', 'Corsair Gaming', true, NOW(), NOW()),
        (gen_random_uuid(), 'Kingston', 'Kingston Technology', true, NOW(), NOW()),
        (gen_random_uuid(), 'Razer', 'Razer Inc', true, NOW(), NOW())
    ON CONFLICT DO NOTHING;
    
    -- Lấy brand IDs
    SELECT "Id" INTO brand_asus FROM "Brands" WHERE "Name" = 'Asus' LIMIT 1;
    SELECT "Id" INTO brand_msi FROM "Brands" WHERE "Name" = 'MSI' LIMIT 1;
    SELECT "Id" INTO brand_gigabyte FROM "Brands" WHERE "Name" = 'Gigabyte' LIMIT 1;
    SELECT "Id" INTO brand_intel FROM "Brands" WHERE "Name" = 'Intel' LIMIT 1;
    SELECT "Id" INTO brand_amd FROM "Brands" WHERE "Name" = 'AMD' LIMIT 1;
    SELECT "Id" INTO brand_nvidia FROM "Brands" WHERE "Name" = 'NVIDIA' LIMIT 1;
    SELECT "Id" INTO brand_corsair FROM "Brands" WHERE "Name" = 'Corsair' LIMIT 1;
    SELECT "Id" INTO brand_kingston FROM "Brands" WHERE "Name" = 'Kingston' LIMIT 1;
    SELECT "Id" INTO brand_logitech FROM "Brands" WHERE "Name" = 'Logitech' LIMIT 1;
    SELECT "Id" INTO brand_razer FROM "Brands" WHERE "Name" = 'Razer' LIMIT 1;
    
    -- LINH KIỆN MÁY TÍNH - CPU
    INSERT INTO "Products" ("Id", "Name", "Sku", "Price", "OldPrice", "CostPrice", "Description", "Specifications", "WarrantyInfo", "CategoryId", "BrandId", "StockQuantity", "Status", "ImageUrl", "IsActive", "CreatedAt", "UpdatedAt", "PublishedAt", "ViewCount", "SoldCount")
    VALUES
    (gen_random_uuid(), 'CPU Intel Core i5-13400F', 'QH-CPU-I513400F', 4890000, 5490000, 4200000, 
     'CPU Intel thế hệ 13 với 10 nhân 16 luồng, hiệu năng vượt trội cho gaming và làm việc đa nhiệm',
     '[{"label": "Số nhân", "value": "10 nhân (6P + 4E)"}, {"label": "Số luồng", "value": "16 luồng"}, {"label": "Xung nhịp", "value": "2.5GHz - 4.6GHz"}, {"label": "Cache", "value": "20MB Intel Smart Cache"}, {"label": "TDP", "value": "65W (148W Turbo)"}, {"label": "Socket", "value": "LGA1700"}]',
     'Bảo hành 36 tháng chính hãng', cat_component, brand_intel, 45, 0, 'https://images.unsplash.com/photo-1555617981-dac3880eac6e?w=500', true, NOW(), NOW(), NOW(), 0, 0),
     
    (gen_random_uuid(), 'CPU AMD Ryzen 5 5600X', 'QH-CPU-R55600X', 3990000, 4790000, 3400000,
     'CPU AMD Ryzen 5000 series với kiến trúc Zen 3, hiệu năng cao cho game và sáng tạo nội dung',
     '[{"label": "Số nhân", "value": "6 nhân"}, {"label": "Số luồng", "value": "12 luồng"}, {"label": "Xung nhịp", "value": "3.7GHz - 4.6GHz"}, {"label": "Cache", "value": "35MB (L2+L3)"}, {"label": "TDP", "value": "65W"}, {"label": "Socket", "value": "AM4"}]',
     'Bảo hành 36 tháng chính hãng', cat_component, brand_amd, 50, 0, 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500', true, NOW(), NOW(), NOW(), 0, 0),
     
    (gen_random_uuid(), 'CPU Intel Core i7-13700K', 'QH-CPU-I713700K', 9890000, 11490000, 8500000,
     'CPU cao cấp với 16 nhân 24 luồng, mở khóa nhân để ép xung tối đa',
     '[{"label": "Số nhân", "value": "16 nhân (8P + 8E)"}, {"label": "Số luồng", "value": "24 luồng"}, {"label": "Xung nhịp", "value": "3.4GHz - 5.4GHz"}, {"label": "Cache", "value": "30MB Intel Smart Cache"}, {"label": "TDP", "value": "125W (253W Turbo)"}, {"label": "Socket", "value": "LGA1700"}]',
     'Bảo hành 36 tháng chính hãng', cat_component, brand_intel, 25, 0, 'https://images.unsplash.com/photo-1555617981-dac3880eac6e?w=500', true, NOW(), NOW(), NOW(), 0, 0);
     
    -- LINH KIỆN - VGA
    INSERT INTO "Products" ("Id", "Name", "Sku", "Price", "OldPrice", "CostPrice", "Description", "Specifications", "WarrantyInfo", "CategoryId", "BrandId", "StockQuantity", "Status", "ImageUrl", "IsActive", "CreatedAt", "UpdatedAt", "PublishedAt", "ViewCount", "SoldCount")
    VALUES
    (gen_random_uuid(), 'VGA MSI GeForce RTX 4060 Ti VENTUS 2X', 'QH-VGA-RTX4060TI', 10490000, 12990000, 9200000,
     'Card đồ họa RTX 4060 Ti với công nghệ DLSS 3 và Ray Tracing thế hệ mới',
     '[{"label": "GPU", "value": "NVIDIA GeForce RTX 4060 Ti"}, {"label": "VRAM", "value": "8GB GDDR6"}, {"label": "Boost Clock", "value": "2595 MHz"}, {"label": "Memory Bus", "value": "128-bit"}, {"label": "Nguồn khuyến nghị", "value": "550W"}, {"label": "Kết nối", "value": "3x DisplayPort 1.4a, 1x HDMI 2.1a"}]',
     'Bảo hành 36 tháng chính hãng MSI', cat_component, brand_msi, 30, 0, 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=500', true, NOW(), NOW(), NOW(), 0, 0),
     
    (gen_random_uuid(), 'VGA ASUS TUF Gaming Radeon RX 7600 XT', 'QH-VGA-RX7600XT', 9990000, 11490000, 8800000,
     'Card đồ họa AMD RDNA 3 với hiệu năng cao và giá cả hợp lý cho game 1080p-1440p',
     '[{"label": "GPU", "value": "AMD Radeon RX 7600 XT"}, {"label": "VRAM", "value": "16GB GDDR6"}, {"label": "Boost Clock", "value": "2755 MHz"}, {"label": "Memory Bus", "value": "128-bit"}, {"label": "Nguồn khuyến nghị", "value": "600W"}, {"label": "Tản nhiệt", "value": "Axial-tech Fan 2.5 slot"}]',
     'Bảo hành 36 tháng chính hãng ASUS', cat_component, brand_asus, 35, 0, 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=500', true, NOW(), NOW(), NOW(), 0, 0);
     
    -- LINH KIỆN - RAM
    INSERT INTO "Products" ("Id", "Name", "Sku", "Price", "OldPrice", "CostPrice", "Description", "Specifications", "WarrantyInfo", "CategoryId", "BrandId", "StockQuantity", "Status", "ImageUrl", "IsActive", "CreatedAt", "UpdatedAt", "PublishedAt", "ViewCount", "SoldCount")
    VALUES
    (gen_random_uuid(), 'RAM Corsair Vengeance RGB 16GB (2x8GB) DDR4 3200MHz', 'QH-RAM-CORS16GB', 1490000, 1890000, 1200000,
     'RAM DDR4 với đèn RGB đồng bộ, hiệu năng ổn định cho gaming',
     '[{"label": "Dung lượng", "value": "16GB (2x8GB)"}, {"label": "Loại RAM", "value": "DDR4"}, {"label": "Tốc độ", "value": "3200MHz"}, {"label": "Timing", "value": "CL16"}, {"label": "Điện áp", "value": "1.35V"}, {"label": "RGB", "value": "10 LED RGB/module"}]',
     'Bảo hành trọn đời', cat_component, brand_corsair, 80, 0, 'https://images.unsplash.com/photo-1541348263662-e068662d82af?w=500', true, NOW(), NOW(), NOW(), 0, 0),
     
    (gen_random_uuid(), 'RAM Kingston Fury Beast 32GB (2x16GB) DDR5 5600MHz', 'QH-RAM-KING32GB', 3290000, 3990000, 2800000,
     'RAM DDR5 thế hệ mới với băng thông cao, tối ưu cho Intel Gen 12-13',
     '[{"label": "Dung lượng", "value": "32GB (2x16GB)"}, {"label": "Loại RAM", "value": "DDR5"}, {"label": "Tốc độ", "value": "5600MHz"}, {"label": "Timing", "value": "CL36"}, {"label": "Điện áp", "value": "1.25V"}, {"label": "Tản nhiệt", "value": "Low-profile heatspreader"}]',
     'Bảo hành trọn đời', cat_component, brand_kingston, 60, 0, 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=500', true, NOW(), NOW(), NOW(), 0, 0);
     
    -- LINH KIỆN - SSD
    INSERT INTO "Products" ("Id", "Name", "Sku", "Price", "OldPrice", "CostPrice", "Description", "Specifications", "WarrantyInfo", "CategoryId", "BrandId", "StockQuantity", "Status", "ImageUrl", "IsActive", "CreatedAt", "UpdatedAt", "PublishedAt", "ViewCount", "SoldCount")
    VALUES
    (gen_random_uuid(), 'SSD Samsung 980 PRO 1TB NVMe PCIe Gen 4.0', 'QH-SSD-SAM1TB', 2490000, 2990000, 2100000,
     'SSD NVMe Gen 4 tốc độ cao với đọc/ghi lên đến 7000/5000 MB/s',
     '[{"label": "Dung lượng", "value": "1TB"}, {"label": "Chuẩn kết nối", "value": "M.2 2280 NVMe PCIe Gen 4.0 x4"}, {"label": "Tốc độ đọc", "value": "7,000 MB/s"}, {"label": "Tốc độ ghi", "value": "5,000 MB/s"}, {"label": "TBW", "value": "600TB"}, {"label": "NAND", "value": "Samsung V-NAND 3-bit MLC"}]',
     'Bảo hành 60 tháng chính hãng', cat_component, brand_asus, 70, 0, 'https://images.unsplash.com/photo-1531492746076-161ca9bcad58?w=500', true, NOW(), NOW(), NOW(), 0, 0),
     
    (gen_random_uuid(), 'SSD Kingston NV2 500GB NVMe PCIe Gen 4.0', 'QH-SSD-KING500GB', 990000, 1290000, 800000,
     'SSD NVMe giá rẻ với hiệu năng tốt cho nâng cấp máy tính',
     '[{"label": "Dung lượng", "value": "500GB"}, {"label": "Chuẩn kết nối", "value": "M.2 2280 NVMe PCIe Gen 4.0 x4"}, {"label": "Tốc độ đọc", "value": "3,500 MB/s"}, {"label": "Tốc độ ghi", "value": "2,100 MB/s"}, {"label": "TBW", "value": "160TB"}, {"label": "NAND", "value": "3D TLC"}]',
     'Bảo hành 36 tháng chính hãng', cat_component, brand_kingston, 100, 0, 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500', true, NOW(), NOW(), NOW(), 0, 0);
     
    -- PHÍM CHUỘT
    INSERT INTO "Products" ("Id", "Name", "Sku", "Price", "OldPrice", "CostPrice", "Description", "Specifications", "WarrantyInfo", "CategoryId", "BrandId", "StockQuantity", "Status", "ImageUrl", "IsActive", "CreatedAt", "UpdatedAt", "PublishedAt", "ViewCount", "SoldCount")
    VALUES
    (gen_random_uuid(), 'Chuột Razer DeathAdder V3', 'QH-MOUSE-RAZER-DA3', 1790000, 2190000, 1500000,
     'Chuột gaming nhẹ 59g với cảm biến Focus Pro 30K DPI',
     '[{"label": "Cảm biến", "value": "Razer Focus Pro 30K"}, {"label": "DPI", "value": "30,000 DPI"}, {"label": "Trọng lượng", "value": "59g"}, {"label": "Kết nối", "value": "USB-C Speedflex Cable"}, {"label": "Switch", "value": "Razer Optical Gen-3"}, {"label": "Độ bền", "value": "90 triệu clicks"}]',
     'Bảo hành 24 tháng chính hãng', cat_gear, brand_razer, 55, 0, 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=500', true, NOW(), NOW(), NOW(), 0, 0),
     
    (gen_random_uuid(), 'Bàn phím cơ Logitech G Pro X TKL', 'QH-KB-LOGI-GPROX', 3290000, 3890000, 2800000,
     'Bàn phím cơ TKL với switch GX Blue/Brown/Red có thể thay đổi',
     '[{"label": "Layout", "value": "TKL (Tenkeyless) 87 phím"}, {"label": "Switch", "value": "GX Blue/Brown/Red (hot-swap)"}, {"label": "Keycap", "value": "PBT Double-shot"}, {"label": "Kết nối", "value": "USB-C detachable"}, {"label": "RGB", "value": "Per-key LIGHTSYNC RGB"}, {"label": "Phần mềm", "value": "G HUB"}]',
     'Bảo hành 24 tháng chính hãng', cat_gear, brand_logitech, 40, 0, 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=500', true, NOW(), NOW(), NOW(), 0, 0);
     
    -- MÀN HÌNH
    INSERT INTO "Products" ("Id", "Name", "Sku", "Price", "OldPrice", "CostPrice", "Description", "Specifications", "WarrantyInfo", "CategoryId", "BrandId", "StockQuantity", "Status", "ImageUrl", "IsActive", "CreatedAt", "UpdatedAt", "PublishedAt", "ViewCount", "SoldCount")
    VALUES
    (gen_random_uuid(), 'Màn hình ASUS TUF Gaming VG27AQ 27 inch', 'QH-MON-ASUS-VG27AQ', 6990000, 8490000, 6000000,
     'Màn hình gaming 2K 165Hz với G-Sync Compatible và ELMB',
     '[{"label": "Kích thước", "value": "27 inch"}, {"label": "Độ phân giải", "value": "2K (2560x1440)"}, {"label": "Tấm nền", "value": "IPS"}, {"label": "Tần số quét", "value": "165Hz"}, {"label": "Thời gian phản hồi", "value": "1ms (MPRT)"}, {"label": "Công nghệ", "value": "G-Sync Compatible, FreeSync Premium"}, {"label": "HDR", "value": "HDR10"}]',
     'Bảo hành 36 tháng chính hãng', cat_screen, brand_asus, 45, 0, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500', true, NOW(), NOW(), NOW(), 0, 0),
     
    (gen_random_uuid(), 'Màn hình MSI MAG274QRF-QD 27 inch', 'QH-MON-MSI-MAG274', 8490000, 9990000, 7500000,
     'Màn hình Quantum Dot với màu sắc 97% DCI-P3 và 165Hz',
     '[{"label": "Kích thước", "value": "27 inch"}, {"label": "Độ phân giải", "value": "2K (2560x1440)"}, {"label": "Tấm nền", "value": "Rapid IPS"}, {"label": "Tần số quét", "value": "165Hz"}, {"label": "Màu sắc", "value": "97% DCI-P3, Quantum Dot"}, {"label": "Công nghệ", "value": "G-Sync Compatible"}, {"label": "HDR", "value": "DisplayHDR 400"}]',
     'Bảo hành 36 tháng chính hãng', cat_screen, brand_msi, 30, 0, 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=500', true, NOW(), NOW(), NOW(), 0, 0);

    RAISE NOTICE 'Đã thêm sản phẩm thành công!';
END $$;
