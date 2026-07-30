-- Cập nhật ImageUrl cho từng sản phẩm bằng ảnh Unsplash phù hợp theo tên sản phẩm.
-- Chạy: docker exec -i quanghuong-postgres psql -U postgres -d quanghuongdb < scripts/update_product_images.sql

BEGIN;

-- Phụ kiện & thiết bị ngoại vi ---------------------------------------------
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'Hub USB-C 7 in 1 Anker PowerExpand+';
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'Bộ vệ sinh laptop đa năng Baseus 8 in 1';
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'Đế tản nhiệt laptop Cooler Master NotePal X3';
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'Túi chống sốc laptop 15.6 inch Tomtoc';

-- Âm thanh & thu hình ------------------------------------------------------
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'Tai nghe Gaming Logitech G Pro X 2 Lightspeed';
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'Microphone HyperX QuadCast S RGB';
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'Loa Logitech Z407 Bluetooth 2.1';
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'Webcam Logitech StreamCam 1080p/60fps';
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'Webcam Logitech C920 HD Pro';

-- Bàn phím & chuột ---------------------------------------------------------
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'Bàn phím cơ Asus ROG Strix Scope RX';
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'Chuột Logitech G502 Hero High Performance';

-- Linh kiện máy tính -------------------------------------------------------
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'CPU Intel Core i5-13400F Box Chính Hãng';
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'RAM Kingston Fury Beast 16GB DDR5 5600MHz';
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'SSD Samsung 980 Pro 1TB NVMe PCIe Gen4';
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'VGA Gigabyte GeForce RTX 4060 WINDFORCE OC 8G';

-- Mạng ---------------------------------------------------------------------
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'Router Wifi 6 TP-Link Archer AX73';
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'Mesh WiFi 6 Asus ZenWiFi AX (XT8) 2 Pack';

-- Laptop -------------------------------------------------------------------
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'Laptop Asus TUF Gaming F15 FX507ZC4-HN095W';
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'Laptop Dell Inspiron 16 5620';
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1587614382346-4ec70e388b28?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'Laptop Lenovo ThinkPad P15v Gen 3 Workstation';
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'MacBook Air M2 13.6 inch (8GB/256GB)';

-- PC & Workstation ---------------------------------------------------------
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'PC Gaming QH Sentinel V1 - i3 12100F | RX 6600';
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'PC Gaming QH Vanguard V2 - i5 13400F | RTX 4060 Ti';
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'PC Workstation QH Creator Pro - i7 13700K | RTX 4070';

-- Màn hình -----------------------------------------------------------------
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1542393545-10f5cde2c810?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'Màn hình Dell UltraSharp U2422H';
UPDATE "Products" SET "ImageUrl" = 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=70' WHERE "Name" = 'Màn hình Samsung Odyssey G5 27 inch Curved';

COMMIT;

SELECT COUNT(*) AS updated_count, COUNT(DISTINCT "ImageUrl") AS unique_urls FROM "Products" WHERE "ImageUrl" LIKE 'https://images.unsplash.com/%';
