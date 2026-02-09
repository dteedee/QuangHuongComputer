-- Seed Orders (Draft, Confirmed, Shipped, Delivered)
DO $$ 
DECLARE 
    cust_id text := '00000000-0000-0000-0000-000000000000'; 
    order1_id UUID := gen_random_uuid();
    order2_id UUID := gen_random_uuid();
    order3_id UUID := gen_random_uuid();
    prod1_id UUID;
    prod2_id UUID;
BEGIN
    -- Get some real product IDs from the database
    SELECT "Id" INTO prod1_id FROM public."Products" WHERE "Name" LIKE '%ASUS ROG%' LIMIT 1;
    SELECT "Id" INTO prod2_id FROM public."Products" WHERE "Name" LIKE '%ASUS TUF%' LIMIT 1;

    -- Order 1: Confirmed (Status 1)
    INSERT INTO public."Orders" (
        "Id", "OrderNumber", "CustomerId", "Status", 
        "SubtotalAmount", "TaxAmount", "TotalAmount", 
        "ShippingAddress", "OrderDate", "CreatedAt"
    ) VALUES (
        order1_id, 'ORD-2024-001', cust_id, 1, 
        42990000, 4299000, 47339000, 
        '123 Đường Láng, Hà Nội', NOW() - INTERVAL '2 hours', NOW()
    ) ON CONFLICT DO NOTHING;

    IF prod1_id IS NOT NULL THEN
        INSERT INTO public."OrderItem" (
            "Id", "OrderId", "ProductId", "ProductName", "UnitPrice", "Quantity", "CreatedAt"
        ) VALUES (
            gen_random_uuid(), order1_id, prod1_id, 'ASUS ROG Strix G16 2024', 42990000, 1, NOW()
        );
    END IF;

    -- Order 2: Delivered (Status 3)
    INSERT INTO public."Orders" (
        "Id", "OrderNumber", "CustomerId", "Status", 
        "SubtotalAmount", "TaxAmount", "TotalAmount", 
        "ShippingAddress", "OrderDate", "CreatedAt"
    ) VALUES (
        order2_id, 'ORD-2024-002', cust_id, 3, 
        28990000, 2899000, 31889000, 
        '456 Lê Lợi, TP. HCM', NOW() - INTERVAL '1 day', NOW()
    ) ON CONFLICT DO NOTHING;

    IF prod2_id IS NOT NULL THEN
        INSERT INTO public."OrderItem" (
            "Id", "OrderId", "ProductId", "ProductName", "UnitPrice", "Quantity", "CreatedAt"
        ) VALUES (
            gen_random_uuid(), order2_id, prod2_id, 'ASUS TUF Gaming F15 2024', 28990000, 1, NOW()
        );
    END IF;

    -- Order 3: Draft (Status 0)
    INSERT INTO public."Orders" (
        "Id", "OrderNumber", "CustomerId", "Status", 
        "SubtotalAmount", "TaxAmount", "TotalAmount", 
        "ShippingAddress", "OrderDate", "CreatedAt"
    ) VALUES (
        order3_id, 'ORD-2024-003', cust_id, 0, 
        15990000, 1599000, 17589000, 
        '789 Trần Hưng Đạo, Đà Nẵng', NOW() - INTERVAL '5 hours', NOW()
    ) ON CONFLICT DO NOTHING;

END $$;
