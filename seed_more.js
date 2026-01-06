
const API_BASE = 'http://localhost:5000/api';

async function seedMore() {
    try {
        const allCatsRes = await fetch(`${API_BASE}/catalog/categories`);
        const allCats = await allCatsRes.json();
        const cats = allCats.value || allCats;
        const catMap = {};
        cats.forEach(c => catMap[c.name] = c.id);

        const allBrandsRes = await fetch(`${API_BASE}/catalog/brands`);
        const allBrands = await allBrandsRes.json();
        const brands = allBrands.value || allBrands;
        const brandMap = {};
        brands.forEach(b => brandMap[b.name] = b.id);

        const extraProducts = [
            { name: 'Laptop Asus Vivobook 15', price: 15500000, description: 'Core i5, 8GB RAM, 512GB SSD', category: 'Laptop', brand: 'Asus' },
            { name: 'Laptop MSI Modern 14', price: 14000000, description: 'Ryzen 5, 8GB RAM', category: 'Laptop', brand: 'MSI' },
            { name: 'PC Gaming QH-Gamer 03', price: 18500000, description: 'i3-12100F, GTX 1650', category: 'PC Gaming', brand: 'MSI' },
            { name: 'Màn hình Asus ProArt PA278CV', price: 12500000, description: '27 inch 2K, 100% sRGB', category: 'Screens', brand: 'Asus' },
            { name: 'Màn hình Samsung Odyssey G5', price: 8900000, description: '27 inch Curve 144Hz', category: 'Screens', brand: 'Samsung' },
            { name: 'Chuột Logitech G102 Gen2', price: 450000, description: 'Lightsync RGB', category: 'Gear', brand: 'Logitech' },
            { name: 'Bàn phím cơ DareU EK87', price: 650000, description: 'Mechanical Brown Switch', category: 'Gear', brand: 'Logitech' },
            { name: 'Ram Kingston Fury Beast 16GB', price: 1800000, description: 'DDR4 3200MHz', category: 'Components', brand: 'Samsung' },
            { name: 'SSD Samsung 980 Pro 1TB', price: 3500000, description: 'NVMe Gen4x4', category: 'Components', brand: 'Samsung' },
            { name: 'Nguồn MSI MAG A650BN', price: 1500000, description: '650W 80 Plus Bronze', category: 'Components', brand: 'MSI' },
            { name: 'Tai nghe Corsair HS55', price: 1200000, description: 'Stereo Gaming Headset', category: 'Audio', brand: 'Asus' },
            { name: 'Webcam Logitech C922', price: 2500000, description: 'Pro Stream 1080p', category: 'Audio', brand: 'Logitech' }
        ];

        for (const p of extraProducts) {
            if (catMap[p.category] && brandMap[p.brand]) {
                await fetch(`${API_BASE}/catalog/products`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: p.name,
                        description: p.description,
                        price: p.price,
                        categoryId: catMap[p.category],
                        brandId: brandMap[p.brand],
                        stockQuantity: 100
                    })
                });
            }
        }
        console.log('Seeded 12 more products!');
    } catch (e) {
        console.error('Seed more failed:', e.message);
    }
}

seedMore();
