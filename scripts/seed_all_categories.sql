-- Script seed sản phẩm cho TẤT CẢ các danh mục
-- Chạy script này để đảm bảo mỗi danh mục đều có sản phẩm

-- Lấy các ID cần thiết
DO $$
DECLARE
    cat_laptop UUID;
    cat_gaming UUID;
    cat_workstation UUID;
    cat_screen UUID;
    cat_component UUID;
    cat_gear UUID;
    cat_network UUID;
    cat_camera UUID;
    cat_audio UUID;
    cat_accessories UUID;

    brand_dell UUID;
    brand_asus UUID;
    brand_hp UUID;
    brand_apple UUID;
    brand_msi UUID;
    brand_gigabyte UUID;
    brand_samsung UUID;
    brand_logitech UUID;
    brand_lenovo UUID;
    brand_acer UUID;
BEGIN
    -- Lấy category IDs
    SELECT "Id" INTO cat_laptop FROM "catalog"."Categories" WHERE "Description" = 'laptop' LIMIT 1;
    SELECT "Id" INTO cat_gaming FROM "catalog"."Categories" WHERE "Description" = 'pc-gaming' LIMIT 1;
    SELECT "Id" INTO cat_workstation FROM "catalog"."Categories" WHERE "Description" = 'workstation' LIMIT 1;
    SELECT "Id" INTO cat_screen FROM "catalog"."Categories" WHERE "Description" = 'screens' LIMIT 1;
    SELECT "Id" INTO cat_component FROM "catalog"."Categories" WHERE "Description" = 'components' LIMIT 1;
    SELECT "Id" INTO cat_gear FROM "catalog"."Categories" WHERE "Description" = 'gear' LIMIT 1;
    SELECT "Id" INTO cat_network FROM "catalog"."Categories" WHERE "Description" = 'network' LIMIT 1;
    SELECT "Id" INTO cat_camera FROM "catalog"."Categories" WHERE "Description" = 'camera' LIMIT 1;
    SELECT "Id" INTO cat_audio FROM "catalog"."Categories" WHERE "Description" = 'audio' LIMIT 1;
    SELECT "Id" INTO cat_accessories FROM "catalog"."Categories" WHERE "Description" = 'accessories' LIMIT 1;

    -- Lấy brand IDs
    SELECT "Id" INTO brand_dell FROM "catalog"."Brands" WHERE "Name" = 'Dell' LIMIT 1;
    SELECT "Id" INTO brand_asus FROM "catalog"."Brands" WHERE "Name" = 'Asus' LIMIT 1;
    SELECT "Id" INTO brand_hp FROM "catalog"."Brands" WHERE "Name" = 'HP' LIMIT 1;
    SELECT "Id" INTO brand_apple FROM "catalog"."Brands" WHERE "Name" = 'Apple' LIMIT 1;
    SELECT "Id" INTO brand_msi FROM "catalog"."Brands" WHERE "Name" = 'MSI' LIMIT 1;
    SELECT "Id" INTO brand_gigabyte FROM "catalog"."Brands" WHERE "Name" = 'Gigabyte' LIMIT 1;
    SELECT "Id" INTO brand_samsung FROM "catalog"."Brands" WHERE "Name" = 'Samsung' LIMIT 1;
    SELECT "Id" INTO brand_logitech FROM "catalog"."Brands" WHERE "Name" = 'Logitech' LIMIT 1;
    SELECT "Id" INTO brand_lenovo FROM "catalog"."Brands" WHERE "Name" = 'Lenovo' LIMIT 1;
    SELECT "Id" INTO brand_acer FROM "catalog"."Brands" WHERE "Name" = 'Acer' LIMIT 1;

    -- WORKSTATION - Máy tính đồ họa
    IF cat_workstation IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "catalog"."Products" WHERE "CategoryId" = cat_workstation LIMIT 1) THEN
        INSERT INTO "catalog"."Products" ("Id", "Name", "Sku", "Description", "Price", "OldPrice", "CategoryId", "BrandId", "StockQuantity", "Status", "Specifications", "WarrantyInfo", "ImageUrl", "IsActive", "CreatedAt", "Weight", "ViewCount", "SoldCount", "AverageRating", "ReviewCount", "LowStockThreshold")
        VALUES
        (gen_random_uuid(), 'PC Workstation QH Creator Pro - i7 13700K | RTX 4070', 'WS-CREATOR-PRO-01', 'Máy trạm đồ họa chuyên nghiệp cho Designer, Video Editor', 42990000, 38500000, cat_workstation, brand_asus, 5, 0, '[{"label": "CPU", "value": "Intel Core i7-13700K"}]', 'Bảo hành 36 tháng', 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=500', true, NOW(), 15.0, 0, 0, 0, 0, 5),
        (gen_random_uuid(), 'Laptop Lenovo ThinkPad P15v Gen 3 Workstation', 'WS-THINKPAD-P15V', 'Laptop workstation di động với màn hình 15.6 inch 4K', 35990000, 32000000, cat_workstation, brand_lenovo, 8, 0, '[{"label": "CPU", "value": "Intel Core i7-12800H"}]', 'Bảo hành 36 tháng Lenovo', 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=500', true, NOW(), 2.5, 0, 0, 0, 0, 5);
    END IF;

    -- COMPONENTS - Linh kiện máy tính
    IF cat_component IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "catalog"."Products" WHERE "CategoryId" = cat_component LIMIT 1) THEN
        INSERT INTO "catalog"."Products" ("Id", "Name", "Sku", "Description", "Price", "OldPrice", "CategoryId", "BrandId", "StockQuantity", "Status", "Specifications", "WarrantyInfo", "ImageUrl", "IsActive", "CreatedAt", "Weight", "ViewCount", "SoldCount", "AverageRating", "ReviewCount", "LowStockThreshold")
        VALUES
        (gen_random_uuid(), 'CPU Intel Core i5-13400F Box Chính Hãng', 'CPU-I5-13400F', 'Bộ xử lý thế hệ 13 Raptor Lake, 10 nhân 16 luồng', 4690000, 4200000, cat_component, brand_gigabyte, 50, 0, '[{"label": "Socket", "value": "LGA 1700"}]', 'Bảo hành 36 tháng', 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500', true, NOW(), 0.5, 0, 0, 0, 0, 10),
        (gen_random_uuid(), 'RAM Kingston Fury Beast 16GB DDR5 5600MHz', 'RAM-FURY-16GB-DDR5', 'Bộ nhớ DDR5 hiệu năng cao với tản nhiệt kim loại', 1490000, 1250000, cat_component, brand_samsung, 80, 0, '[{"label": "Dung lượng", "value": "16GB"}]', 'Bảo hành lifetime', 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=500', true, NOW(), 0.1, 0, 0, 0, 0, 15),
        (gen_random_uuid(), 'SSD Samsung 980 Pro 1TB NVMe PCIe Gen4', 'SSD-980PRO-1TB', 'Ổ cứng SSD cao cấp nhất của Samsung', 2890000, 2450000, cat_component, brand_samsung, 60, 0, '[{"label": "Dung lượng", "value": "1TB"}]', 'Bảo hành 5 năm Samsung', 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500', true, NOW(), 0.1, 0, 0, 0, 0, 10),
        (gen_random_uuid(), 'VGA Gigabyte GeForce RTX 4060 WINDFORCE OC 8G', 'VGA-RTX4060-8G', 'Card đồ họa RTX 40 series với kiến trúc Ada Lovelace', 8490000, 7500000, cat_component, brand_gigabyte, 25, 0, '[{"label": "GPU", "value": "RTX 4060"}]', 'Bảo hành 36 tháng Gigabyte', 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=500', true, NOW(), 1.2, 0, 0, 0, 0, 5);
    END IF;

    -- NETWORK - Thiết bị mạng
    IF cat_network IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "catalog"."Products" WHERE "CategoryId" = cat_network LIMIT 1) THEN
        INSERT INTO "catalog"."Products" ("Id", "Name", "Sku", "Description", "Price", "OldPrice", "CategoryId", "BrandId", "StockQuantity", "Status", "Specifications", "WarrantyInfo", "ImageUrl", "IsActive", "CreatedAt", "Weight", "ViewCount", "SoldCount", "AverageRating", "ReviewCount", "LowStockThreshold")
        VALUES
        (gen_random_uuid(), 'Router Wifi 6 TP-Link Archer AX73', 'ROUTER-AX73', 'Bộ phát WiFi 6 chuẩn AX5400', 2990000, 2500000, cat_network, brand_logitech, 35, 0, '[{"label": "Chuẩn WiFi", "value": "WiFi 6"}]', 'Bảo hành 24 tháng TP-Link', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500', true, NOW(), 0.8, 0, 0, 0, 0, 10),
        (gen_random_uuid(), 'Mesh WiFi 6 Asus ZenWiFi AX (XT8) 2 Pack', 'MESH-ZENWIFI-XT8', 'Hệ thống Mesh WiFi 6 tri-band AX6600', 9990000, 8500000, cat_network, brand_asus, 15, 0, '[{"label": "Chuẩn WiFi", "value": "WiFi 6 AX6600"}]', 'Bảo hành 24 tháng Asus', 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=500', true, NOW(), 1.5, 0, 0, 0, 0, 5);
    END IF;

    -- CAMERA
    IF cat_camera IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "catalog"."Products" WHERE "CategoryId" = cat_camera LIMIT 1) THEN
        INSERT INTO "catalog"."Products" ("Id", "Name", "Sku", "Description", "Price", "OldPrice", "CategoryId", "BrandId", "StockQuantity", "Status", "Specifications", "WarrantyInfo", "ImageUrl", "IsActive", "CreatedAt", "Weight", "ViewCount", "SoldCount", "AverageRating", "ReviewCount", "LowStockThreshold")
        VALUES
        (gen_random_uuid(), 'Webcam Logitech C920 HD Pro', 'WEBCAM-C920', 'Webcam Full HD 1080p/30fps với tự động lấy nét', 1690000, 1400000, cat_camera, brand_logitech, 45, 0, '[{"label": "Độ phân giải", "value": "Full HD 1080p"}]', 'Bảo hành 24 tháng Logitech', 'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=500', true, NOW(), 0.2, 0, 0, 0, 0, 10),
        (gen_random_uuid(), 'Webcam Logitech StreamCam 1080p/60fps', 'WEBCAM-STREAMCAM', 'Webcam chuyên stream với Full HD 60fps', 3290000, 2800000, cat_camera, brand_logitech, 20, 0, '[{"label": "Độ phân giải", "value": "Full HD 1080p/60fps"}]', 'Bảo hành 24 tháng Logitech', 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=500', true, NOW(), 0.25, 0, 0, 0, 0, 5);
    END IF;

    -- AUDIO - Loa, Mic, Webcam, Stream
    IF cat_audio IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "catalog"."Products" WHERE "CategoryId" = cat_audio LIMIT 1) THEN
        INSERT INTO "catalog"."Products" ("Id", "Name", "Sku", "Description", "Price", "OldPrice", "CategoryId", "BrandId", "StockQuantity", "Status", "Specifications", "WarrantyInfo", "ImageUrl", "IsActive", "CreatedAt", "Weight", "ViewCount", "SoldCount", "AverageRating", "ReviewCount", "LowStockThreshold")
        VALUES
        (gen_random_uuid(), 'Loa Logitech Z407 Bluetooth 2.1', 'LOA-Z407', 'Hệ thống loa 2.1 với subwoofer mạnh mẽ', 1890000, 1550000, cat_audio, brand_logitech, 30, 0, '[{"label": "Công suất", "value": "80W Peak"}]', 'Bảo hành 24 tháng Logitech', 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=500', true, NOW(), 3.0, 0, 0, 0, 0, 10),
        (gen_random_uuid(), 'Microphone HyperX QuadCast S RGB', 'MIC-QUADCAST-S', 'Micro condenser USB chuyên stream với đèn RGB', 3690000, 3100000, cat_audio, brand_hp, 25, 0, '[{"label": "Loại", "value": "Condenser"}]', 'Bảo hành 24 tháng HyperX', 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=500', true, NOW(), 0.8, 0, 0, 0, 0, 5),
        (gen_random_uuid(), 'Tai nghe Gaming Logitech G Pro X 2 Lightspeed', 'HEADSET-GPROX2', 'Tai nghe gaming không dây pro-grade với driver Graphene 50mm', 5490000, 4800000, cat_audio, brand_logitech, 18, 0, '[{"label": "Driver", "value": "50mm Graphene"}]', 'Bảo hành 24 tháng Logitech', 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=500', true, NOW(), 0.35, 0, 0, 0, 0, 5);
    END IF;

    -- ACCESSORIES - Phụ kiện máy tính
    IF cat_accessories IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "catalog"."Products" WHERE "CategoryId" = cat_accessories LIMIT 1) THEN
        INSERT INTO "catalog"."Products" ("Id", "Name", "Sku", "Description", "Price", "OldPrice", "CategoryId", "BrandId", "StockQuantity", "Status", "Specifications", "WarrantyInfo", "ImageUrl", "IsActive", "CreatedAt", "Weight", "ViewCount", "SoldCount", "AverageRating", "ReviewCount", "LowStockThreshold")
        VALUES
        (gen_random_uuid(), 'Túi chống sốc laptop 15.6 inch Tomtoc', 'BAG-TOMTOC-156', 'Túi chống sốc cao cấp với lớp đệm CornerArmor', 590000, 450000, cat_accessories, brand_dell, 100, 0, '[{"label": "Kích thước", "value": "15.6 inch"}]', 'Bảo hành 12 tháng', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500', true, NOW(), 0.4, 0, 0, 0, 0, 20),
        (gen_random_uuid(), 'Đế tản nhiệt laptop Cooler Master NotePal X3', 'COOLER-X3', 'Đế tản nhiệt với quạt 200mm siêu êm', 890000, 720000, cat_accessories, brand_msi, 55, 0, '[{"label": "Quạt", "value": "200mm LED"}]', 'Bảo hành 24 tháng', 'https://images.unsplash.com/photo-1527443060795-0f23b75a5da7?w=500', true, NOW(), 1.0, 0, 0, 0, 0, 10),
        (gen_random_uuid(), 'Bộ vệ sinh laptop đa năng 8 in 1', 'CLEANING-KIT-8IN1', 'Bộ kit vệ sinh đa năng cho laptop', 290000, 220000, cat_accessories, brand_logitech, 200, 0, '[{"label": "Bộ gồm", "value": "8 món"}]', 'Bảo hành 6 tháng', 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=500', true, NOW(), 0.3, 0, 0, 0, 0, 30),
        (gen_random_uuid(), 'Hub USB-C 7 in 1 Anker PowerExpand+', 'HUB-ANKER-7IN1', 'Hub đa năng với HDMI 4K, USB-A, PD 100W', 1290000, 1050000, cat_accessories, brand_apple, 70, 0, '[{"label": "Cổng", "value": "7 cổng"}]', 'Bảo hành 18 tháng Anker', 'https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?w=500', true, NOW(), 0.15, 0, 0, 0, 0, 15);
    END IF;

    RAISE NOTICE 'Seed completed for all categories!';
END $$;

-- Xóa cache để refresh productCount
-- Bạn cần restart backend hoặc chờ cache expire (1 giờ)
