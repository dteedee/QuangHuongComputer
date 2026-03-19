-- Thêm nhiều sản phẩm để trang chủ sinh động hơn
DO $$
DECLARE
    cat_component UUID;
    cat_laptop UUID;
    cat_screen UUID;
    cat_gear UUID;
    cat_gaming UUID;
    
    brand_asus UUID;
    brand_msi UUID;
    brand_gigabyte UUID;
    brand_corsair UUID;
    brand_kingston UUID;
    brand_samsung UUID;
    brand_logitech UUID;
    brand_razer UUID;
    brand_amd UUID;
    brand_intel UUID;
    brand_nvidia UUID;
BEGIN
    -- Lấy category IDs
    SELECT "Id" INTO cat_component FROM "Categories" WHERE "Description" = 'components' LIMIT 1;
    SELECT "Id" INTO cat_laptop FROM "Categories" WHERE "Description" = 'laptop' LIMIT 1;
    SELECT "Id" INTO cat_screen FROM "Categories" WHERE "Description" = 'screens' LIMIT 1;
    SELECT "Id" INTO cat_gear FROM "Categories" WHERE "Description" = 'gear' LIMIT 1;
    SELECT "Id" INTO cat_gaming FROM "Categories" WHERE "Description" = 'pc-gaming' LIMIT 1;
    
    -- Lấy brand IDs
    SELECT "Id" INTO brand_asus FROM "Brands" WHERE "Name" = 'Asus' LIMIT 1;
    SELECT "Id" INTO brand_msi FROM "Brands" WHERE "Name" = 'MSI' LIMIT 1;
    SELECT "Id" INTO brand_gigabyte FROM "Brands" WHERE "Name" = 'Gigabyte' LIMIT 1;
    SELECT "Id" INTO brand_samsung FROM "Brands" WHERE "Name" = 'Samsung' LIMIT 1;
    SELECT "Id" INTO brand_logitech FROM "Brands" WHERE "Name" = 'Logitech' LIMIT 1;
    
    -- Thêm brands nếu chưa có
    IF NOT EXISTS (SELECT 1 FROM "Brands" WHERE "Name" = 'Corsair') THEN
        INSERT INTO "Brands" ("Id", "Name", "Description", "IsActive", "CreatedAt", "UpdatedAt")
        VALUES (gen_random_uuid(), 'Corsair', 'Corsair Gaming', true, NOW(), NOW());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM "Brands" WHERE "Name" = 'Kingston') THEN
        INSERT INTO "Brands" ("Id", "Name", "Description", "IsActive", "CreatedAt", "UpdatedAt")
        VALUES (gen_random_uuid(), 'Kingston', 'Kingston Technology', true, NOW(), NOW());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM "Brands" WHERE "Name" = 'Razer') THEN
        INSERT INTO "Brands" ("Id", "Name", "Description", "IsActive", "CreatedAt", "UpdatedAt")
        VALUES (gen_random_uuid(), 'Razer', 'Razer Inc', true, NOW(), NOW());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM "Brands" WHERE "Name" = 'Intel') THEN
        INSERT INTO "Brands" ("Id", "Name", "Description", "IsActive", "CreatedAt", "UpdatedAt")
        VALUES (gen_random_uuid(), 'Intel', 'Intel Corporation', true, NOW(), NOW());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM "Brands" WHERE "Name" = 'AMD') THEN
        INSERT INTO "Brands" ("Id", "Name", "Description", "IsActive", "CreatedAt", "UpdatedAt")
        VALUES (gen_random_uuid(), 'AMD', 'Advanced Micro Devices', true, NOW(), NOW());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM "Brands" WHERE "Name" = 'NVIDIA') THEN
        INSERT INTO "Brands" ("Id", "Name", "Description", "IsActive", "CreatedAt", "UpdatedAt")
        VALUES (gen_random_uuid(), 'NVIDIA', 'NVIDIA Corporation', true, NOW(), NOW());
    END IF;
    
    SELECT "Id" INTO brand_corsair FROM "Brands" WHERE "Name" = 'Corsair' LIMIT 1;
    SELECT "Id" INTO brand_kingston FROM "Brands" WHERE "Name" = 'Kingston' LIMIT 1;
    SELECT "Id" INTO brand_razer FROM "Brands" WHERE "Name" = 'Razer' LIMIT 1;
    SELECT "Id" INTO brand_intel FROM "Brands" WHERE "Name" = 'Intel' LIMIT 1;
    SELECT "Id" INTO brand_amd FROM "Brands" WHERE "Name" = 'AMD' LIMIT 1;
    SELECT "Id" INTO brand_nvidia FROM "Brands" WHERE "Name" = 'NVIDIA' LIMIT 1;
    
    -- LINH KIỆN - CPU (chỉ thêm nếu SKU chưa tồn tại)
    IF NOT EXISTS (SELECT 1 FROM "Products" WHERE "Sku" = 'CPU-I5-13400F') THEN
        INSERT INTO "Products" ("Id", "Name", "Sku", "Price", "OldPrice", "CostPrice", "Description", "Specifications", "WarrantyInfo", "CategoryId", "BrandId", "StockQuantity", "Status", "ImageUrl", "IsActive", "CreatedAt", "UpdatedAt", "PublishedAt")
        VALUES (gen_random_uuid(), 'CPU Intel Core i5-13400F (10 nhân 16 luồng)', 'CPU-I5-13400F', 4890000, 5490000, 4200000, 
        'CPU Intel thế hệ 13 với 10 nhân 16 luồng, xung nhịp tối đa 4.6GHz, hiệu năng vượt trội cho gaming',
        '[{"label": "Số nhân", "value": "10 (6P+4E)"}, {"label": "Số luồng", "value": "16"}, {"label": "Xung nhịp", "value": "2.5-4.6GHz"}, {"label": "Cache", "value": "20MB"}, {"label": "Socket", "value": "LGA1700"}]',
        'Bảo hành 36 tháng chính hãng', cat_component, brand_intel, 45, 0, 'https://images.unsplash.com/photo-1555617981-dac3880eac6e?w=500', true, NOW(), NOW(), NOW());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM "Products" WHERE "Sku" = 'CPU-R5-5600X') THEN
        INSERT INTO "Products" ("Id", "Name", "Sku", "Price", "OldPrice", "CostPrice", "Description", "Specifications", "WarrantyInfo", "CategoryId", "BrandId", "StockQuantity", "Status", "ImageUrl", "IsActive", "CreatedAt", "UpdatedAt", "PublishedAt")
        VALUES (gen_random_uuid(), 'CPU AMD Ryzen 5 5600X (6 nhân 12 luồng)', 'CPU-R5-5600X', 3990000, 4790000, 3400000,
        'CPU AMD Ryzen 5000 series với kiến trúc Zen 3, xung nhịp tối đa 4.6GHz, hiệu năng cao',
        '[{"label": "Số nhân", "value": "6"}, {"label": "Số luồng", "value": "12"}, {"label": "Xung nhịp", "value": "3.7-4.6GHz"}, {"label": "Cache", "value": "35MB"}, {"label": "TDP", "value": "65W"}]',
        'Bảo hành 36 tháng chính hãng', cat_component, brand_amd, 50, 0, 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500', true, NOW(), NOW(), NOW());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM "Products" WHERE "Sku" = 'CPU-I7-13700K') THEN
        INSERT INTO "Products" ("Id", "Name", "Sku", "Price", "OldPrice", "CostPrice", "Description", "Specifications", "WarrantyInfo", "CategoryId", "BrandId", "StockQuantity", "Status", "ImageUrl", "IsActive", "CreatedAt", "UpdatedAt", "PublishedAt")
        VALUES (gen_random_uuid(), 'CPU Intel Core i7-13700K (16 nhân 24 luồng)', 'CPU-I7-13700K', 9890000, 11490000, 8500000,
        'CPU cao cấp Intel Gen 13 với 16 nhân 24 luồng, mở khóa để ép xung, xung nhịp tối đa 5.4GHz',
        '[{"label": "Số nhân", "value": "16 (8P+8E)"}, {"label": "Số luồng", "value": "24"}, {"label": "Xung nhịp", "value": "3.4-5.4GHz"}, {"label": "Cache", "value": "30MB"}, {"label": "Socket", "value": "LGA1700"}]',
        'Bảo hành 36 tháng chính hãng', cat_component, brand_intel, 25, 0, 'https://images.unsplash.com/photo-1555617981-dac3880eac6e?w=500', true, NOW(), NOW(), NOW());
    END IF;
    
    -- LINH KIỆN - VGA
    IF NOT EXISTS (SELECT 1 FROM "Products" WHERE "Sku" = 'VGA-RTX4060TI-MSI') THEN
        INSERT INTO "Products" ("Id", "Name", "Sku", "Price", "OldPrice", "CostPrice", "Description", "Specifications", "WarrantyInfo", "CategoryId", "BrandId", "StockQuantity", "Status", "ImageUrl", "IsActive", "CreatedAt", "UpdatedAt", "PublishedAt")
        VALUES (gen_random_uuid(), 'VGA MSI RTX 4060 Ti VENTUS 2X 8GB', 'VGA-RTX4060TI-MSI', 10490000, 12990000, 9200000,
        'Card đồ họa RTX 4060 Ti với công nghệ DLSS 3, Ray Tracing thế hệ mới, boost clock 2595MHz',
        '[{"label": "GPU", "value": "RTX 4060 Ti"}, {"label": "VRAM", "value": "8GB GDDR6"}, {"label": "Boost Clock", "value": "2595 MHz"}, {"label": "Bus", "value": "128-bit"}, {"label": "Nguồn", "value": "550W+"}]',
        'Bảo hành 36 tháng chính hãng', cat_component, brand_msi, 30, 0, 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=500', true, NOW(), NOW(), NOW());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM "Products" WHERE "Sku" = 'VGA-RX7600XT-ASUS') THEN
        INSERT INTO "Products" ("Id", "Name", "Sku", "Price", "OldPrice", "CostPrice", "Description", "Specifications", "WarrantyInfo", "CategoryId", "BrandId", "StockQuantity", "Status", "ImageUrl", "IsActive", "CreatedAt", "UpdatedAt", "PublishedAt")
        VALUES (gen_random_uuid(), 'VGA ASUS TUF RX 7600 XT 16GB', 'VGA-RX7600XT-ASUS', 9990000, 11490000, 8800000,
        'Card AMD RDNA 3 với 16GB VRAM, hiệu năng cao cho game 1440p, boost clock 2755MHz',
        '[{"label": "GPU", "value": "RX 7600 XT"}, {"label": "VRAM", "value": "16GB GDDR6"}, {"label": "Boost Clock", "value": "2755 MHz"}, {"label": "Bus", "value": "128-bit"}, {"label": "Nguồn", "value": "600W+"}]',
        'Bảo hành 36 tháng chính hãng', cat_component, brand_asus, 35, 0, 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=500', true, NOW(), NOW(), NOW());
    END IF;
    
    -- LINH KIỆN - RAM
    IF NOT EXISTS (SELECT 1 FROM "Products" WHERE "Sku" = 'RAM-CORS-16GB-DDR4') THEN
        INSERT INTO "Products" ("Id", "Name", "Sku", "Price", "OldPrice", "CostPrice", "Description", "Specifications", "WarrantyInfo", "CategoryId", "BrandId", "StockQuantity", "Status", "ImageUrl", "IsActive", "CreatedAt", "UpdatedAt", "PublishedAt")
        VALUES (gen_random_uuid(), 'RAM Corsair Vengeance RGB 16GB DDR4 3200MHz', 'RAM-CORS-16GB-DDR4', 1490000, 1890000, 1200000,
        'RAM DDR4 với đèn RGB đồng bộ, 2 thanh 8GB, tốc độ 3200MHz, CL16',
        '[{"label": "Dung lượng", "value": "16GB (2x8GB)"}, {"label": "Loại", "value": "DDR4"}, {"label": "Tốc độ", "value": "3200MHz"}, {"label": "CAS", "value": "CL16"}, {"label": "RGB", "value": "10 LED/thanh"}]',
        'Bảo hành trọn đời', cat_component, brand_corsair, 80, 0, 'https://images.unsplash.com/photo-1541348263662-e068662d82af?w=500', true, NOW(), NOW(), NOW());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM "Products" WHERE "Sku" = 'RAM-KING-32GB-DDR5') THEN
        INSERT INTO "Products" ("Id", "Name", "Sku", "Price", "OldPrice", "CostPrice", "Description", "Specifications", "WarrantyInfo", "CategoryId", "BrandId", "StockQuantity", "Status", "ImageUrl", "IsActive", "CreatedAt", "UpdatedAt", "PublishedAt")
        VALUES (gen_random_uuid(), 'RAM Kingston Fury Beast 32GB DDR5 5600MHz', 'RAM-KING-32GB-DDR5', 3290000, 3990000, 2800000,
        'RAM DDR5 thế hệ mới, 2 thanh 16GB, tốc độ 5600MHz, tương thích Intel Gen 12-13',
        '[{"label": "Dung lượng", "value": "32GB (2x16GB)"}, {"label": "Loại", "value": "DDR5"}, {"label": "Tốc độ", "value": "5600MHz"}, {"label": "CAS", "value": "CL36"}, {"label": "Tản nhiệt", "value": "Low-profile"}]',
        'Bảo hành trọn đời', cat_component, brand_kingston, 60, 0, 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=500', true, NOW(), NOW(), NOW());
    END IF;
    
    -- LINH KIỆN - SSD
    IF NOT EXISTS (SELECT 1 FROM "Products" WHERE "Sku" = 'SSD-SAM-1TB-980PRO') THEN
        INSERT INTO "Products" ("Id", "Name", "Sku", "Price", "OldPrice", "CostPrice", "Description", "Specifications", "WarrantyInfo", "CategoryId", "BrandId", "StockQuantity", "Status", "ImageUrl", "IsActive", "CreatedAt", "UpdatedAt", "PublishedAt")
        VALUES (gen_random_uuid(), 'SSD Samsung 980 PRO 1TB NVMe Gen 4', 'SSD-SAM-1TB-980PRO', 2490000, 2990000, 2100000,
        'SSD NVMe Gen 4 tốc độ cao, đọc 7000MB/s, ghi 5000MB/s, V-NAND 3-bit MLC',
        '[{"label": "Dung lượng", "value": "1TB"}, {"label": "Chuẩn", "value": "M.2 NVMe Gen 4"}, {"label": "Đọc", "value": "7000 MB/s"}, {"label": "Ghi", "value": "5000 MB/s"}, {"label": "TBW", "value": "600TB"}]',
        'Bảo hành 60 tháng', cat_component, brand_samsung, 70, 0, 'https://images.unsplash.com/photo-1531492746076-161ca9bcad58?w=500', true, NOW(), NOW(), NOW());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM "Products" WHERE "Sku" = 'SSD-KING-500GB-NV2') THEN
        INSERT INTO "Products" ("Id", "Name", "Sku", "Price", "OldPrice", "CostPrice", "Description", "Specifications", "WarrantyInfo", "CategoryId", "BrandId", "StockQuantity", "Status", "ImageUrl", "IsActive", "CreatedAt", "UpdatedAt", "PublishedAt")
        VALUES (gen_random_uuid(), 'SSD Kingston NV2 500GB NVMe Gen 4', 'SSD-KING-500GB-NV2', 990000, 1290000, 800000,
        'SSD NVMe Gen 4 giá tốt, tốc độ đọc 3500MB/s, ghi 2100MB/s, 3D TLC NAND',
        '[{"label": "Dung lượng", "value": "500GB"}, {"label": "Chuẩn", "value": "M.2 NVMe Gen 4"}, {"label": "Đọc", "value": "3500 MB/s"}, {"label": "Ghi", "value": "2100 MB/s"}, {"label": "TBW", "value": "160TB"}]',
        'Bảo hành 36 tháng', cat_component, brand_kingston, 100, 0, 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500', true, NOW(), NOW(), NOW());
    END IF;
    
    -- PHÍM CHUỘT - GEAR
    IF NOT EXISTS (SELECT 1 FROM "Products" WHERE "Sku" = 'MOUSE-RAZER-DA-V3') THEN
        INSERT INTO "Products" ("Id", "Name", "Sku", "Price", "OldPrice", "CostPrice", "Description", "Specifications", "WarrantyInfo", "CategoryId", "BrandId", "StockQuantity", "Status", "ImageUrl", "IsActive", "CreatedAt", "UpdatedAt", "PublishedAt")
        VALUES (gen_random_uuid(), 'Chuột Razer DeathAdder V3 30K DPI', 'MOUSE-RAZER-DA-V3', 1790000, 2190000, 1500000,
        'Chuột gaming nhẹ 59g, cảm biến Focus Pro 30K DPI, switch quang học Gen-3',
        '[{"label": "Cảm biến", "value": "Focus Pro 30K"}, {"label": "DPI", "value": "30,000"}, {"label": "Trọng lượng", "value": "59g"}, {"label": "Kết nối", "value": "USB-C Speedflex"}, {"label": "Độ bền", "value": "90M clicks"}]',
        'Bảo hành 24 tháng', cat_gear, brand_razer, 55, 0, 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=500', true, NOW(), NOW(), NOW());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM "Products" WHERE "Sku" = 'KB-LOGI-GPROX-TKL') THEN
        INSERT INTO "Products" ("Id", "Name", "Sku", "Price", "OldPrice", "CostPrice", "Description", "Specifications", "WarrantyInfo", "CategoryId", "BrandId", "StockQuantity", "Status", "ImageUrl", "IsActive", "CreatedAt", "UpdatedAt", "PublishedAt")
        VALUES (gen_random_uuid(), 'Bàn phím Logitech G Pro X TKL', 'KB-LOGI-GPROX-TKL', 3290000, 3890000, 2800000,
        'Bàn phím cơ TKL (87 phím), switch GX hot-swap, keycap PBT double-shot, RGB per-key',
        '[{"label": "Layout", "value": "TKL 87 phím"}, {"label": "Switch", "value": "GX hot-swap"}, {"label": "Keycap", "value": "PBT double-shot"}, {"label": "RGB", "value": "Per-key LIGHTSYNC"}, {"label": "Kết nối", "value": "USB-C"}]',
        'Bảo hành 24 tháng', cat_gear, brand_logitech, 40, 0, 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=500', true, NOW(), NOW(), NOW());
    END IF;
    
    -- MÀN HÌNH
    IF NOT EXISTS (SELECT 1 FROM "Products" WHERE "Sku" = 'MON-ASUS-VG27AQ') THEN
        INSERT INTO "Products" ("Id", "Name", "Sku", "Price", "OldPrice", "CostPrice", "Description", "Specifications", "WarrantyInfo", "CategoryId", "BrandId", "StockQuantity", "Status", "ImageUrl", "IsActive", "CreatedAt", "UpdatedAt", "PublishedAt")
        VALUES (gen_random_uuid(), 'Màn hình ASUS TUF VG27AQ 27" 2K 165Hz', 'MON-ASUS-VG27AQ', 6990000, 8490000, 6000000,
        'Màn hình gaming 27 inch 2K IPS, 165Hz, 1ms, G-Sync Compatible, HDR10',
        '[{"label": "Kích thước", "value": "27 inch"}, {"label": "Độ phân giải", "value": "2K (2560x1440)"}, {"label": "Tấm nền", "value": "IPS"}, {"label": "Tần số", "value": "165Hz"}, {"label": "Phản hồi", "value": "1ms MPRT"}]',
        'Bảo hành 36 tháng', cat_screen, brand_asus, 45, 0, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500', true, NOW(), NOW(), NOW());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM "Products" WHERE "Sku" = 'MON-MSI-MAG274QRF') THEN
        INSERT INTO "Products" ("Id", "Name", "Sku", "Price", "OldPrice", "CostPrice", "Description", "Specifications", "WarrantyInfo", "CategoryId", "BrandId", "StockQuantity", "Status", "ImageUrl", "IsActive", "CreatedAt", "UpdatedAt", "PublishedAt")
        VALUES (gen_random_uuid(), 'Màn hình MSI MAG274 27" 2K Quantum Dot', 'MON-MSI-MAG274QRF', 8490000, 9990000, 7500000,
        'Màn hình 27 inch Quantum Dot, 2K Rapid IPS, 165Hz, 97% DCI-P3, HDR400',
        '[{"label": "Kích thước", "value": "27 inch"}, {"label": "Độ phân giải", "value": "2K (2560x1440)"}, {"label": "Tấm nền", "value": "Rapid IPS QD"}, {"label": "Tần số", "value": "165Hz"}, {"label": "Màu sắc", "value": "97% DCI-P3"}]',
        'Bảo hành 36 tháng', cat_screen, brand_msi, 30, 0, 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=500', true, NOW(), NOW(), NOW());
    END IF;
    
    -- LAPTOP thêm
    IF NOT EXISTS (SELECT 1 FROM "Products" WHERE "Sku" = 'LAP-ASUS-G15-2023') THEN
        INSERT INTO "Products" ("Id", "Name", "Sku", "Price", "OldPrice", "CostPrice", "Description", "Specifications", "WarrantyInfo", "CategoryId", "BrandId", "StockQuantity", "Status", "ImageUrl", "IsActive", "CreatedAt", "UpdatedAt", "PublishedAt")
        VALUES (gen_random_uuid(), 'Laptop Asus ROG Strix G15 i7-13650HX RTX 4060', 'LAP-ASUS-G15-2023', 32990000, 35990000, 29000000,
        'Laptop gaming cao cấp ROG Strix G15 với i7 Gen 13, RTX 4060 8GB, màn hình 165Hz',
        '[{"label": "CPU", "value": "i7-13650HX (14 nhân)"}, {"label": "VGA", "value": "RTX 4060 8GB"}, {"label": "RAM", "value": "16GB DDR5"}, {"label": "SSD", "value": "512GB NVMe Gen 4"}, {"label": "Màn hình", "value": "15.6\" FHD 165Hz"}]',
        'Bảo hành 24 tháng', cat_laptop, brand_asus, 18, 0, 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=500', true, NOW(), NOW(), NOW());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM "Products" WHERE "Sku" = 'LAP-MSI-KATANA-15') THEN
        INSERT INTO "Products" ("Id", "Name", "Sku", "Price", "OldPrice", "CostPrice", "Description", "Specifications", "WarrantyInfo", "CategoryId", "BrandId", "StockQuantity", "Status", "ImageUrl", "IsActive", "CreatedAt", "UpdatedAt", "PublishedAt")
        VALUES (gen_random_uuid(), 'Laptop MSI Katana 15 i7-13620H RTX 4050', 'LAP-MSI-KATANA-15', 24990000, 27990000, 22000000,
        'Laptop gaming MSI Katana 15 với i7 Gen 13, RTX 4050 6GB, màn hình 144Hz',
        '[{"label": "CPU", "value": "i7-13620H (10 nhân)"}, {"label": "VGA", "value": "RTX 4050 6GB"}, {"label": "RAM", "value": "16GB DDR5"}, {"label": "SSD", "value": "512GB NVMe"}, {"label": "Màn hình", "value": "15.6\" FHD 144Hz"}]',
        'Bảo hành 24 tháng', cat_laptop, brand_msi, 22, 0, 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=500', true, NOW(), NOW(), NOW());
    END IF;
    
    RAISE NOTICE 'Đã thêm thành công các sản phẩm mới!';
END $$;
