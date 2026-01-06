
const API_BASE = 'http://localhost:5000/api';

const categories = [
    { name: 'Laptop', description: 'Laptop - Máy tính xách tay' },
    { name: 'PC Gaming', description: 'Máy tính chơi game' },
    { name: 'Workstation', description: 'Máy tính đồ họa' },
    { name: 'Office', description: 'Máy tính văn phòng' },
    { name: 'Components', description: 'Linh kiện máy tính' },
    { name: 'Screens', description: 'Màn hình máy tính' },
    { name: 'Gear', description: 'Phím, Chuột - Gaming Gear' },
    { name: 'Network', description: 'Thiết bị mạng' },
    { name: 'Camera', description: 'Camera giám sát' },
    { name: 'Audio', description: 'Loa, Mic, Webcam' },
    { name: 'Accessories', description: 'Phụ kiện máy tính' }
];

const brands = [
    { name: 'Asus', description: 'Asus Brand' },
    { name: 'Dell', description: 'Dell Brand' },
    { name: 'HP', description: 'HP Brand' },
    { name: 'MSI', description: 'MSI Brand' },
    { name: 'Lenovo', description: 'Lenovo Brand' },
    { name: 'Apple', description: 'Apple Brand' },
    { name: 'Logitech', description: 'Logitech Brand' },
    { name: 'Samsung', description: 'Samsung Brand' }
];

async function seed() {
    try {
        console.log('Seeding categories...');
        const catMap = {};
        for (const cat of categories) {
            try {
                const res = await fetch(`${API_BASE}/catalog/categories`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cat)
                });
                const data = await res.json();
                catMap[cat.name] = data.categoryId;
            } catch (e) {
                // If it exists, let's try to find it
                const allRes = await fetch(`${API_BASE}/catalog/categories`);
                const all = await allRes.json();
                const existing = (all.value || all).find(c => c.name === cat.name);
                if (existing) catMap[cat.name] = existing.id;
            }
        }

        console.log('Seeding brands...');
        const brandMap = {};
        for (const brand of brands) {
            try {
                const res = await fetch(`${API_BASE}/catalog/brands`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(brand)
                });
                const data = await res.json();
                brandMap[brand.name] = data.brandId;
            } catch (e) {
                const allRes = await fetch(`${API_BASE}/catalog/brands`);
                const all = await allRes.json();
                const existing = (all.value || all).find(b => b.name === brand.name);
                if (existing) brandMap[brand.name] = existing.id;
            }
        }

        console.log('Seeding products...');
        const products = [
            { name: 'Laptop Asus ROG Zephyrus G14', price: 35000000, description: 'Gaming Laptop Ryzen 9, RTX 3060', category: 'Laptop', brand: 'Asus' },
            { name: 'Laptop Dell XPS 13 9310', price: 42000000, description: 'Ultrabook Core i7, 16GB RAM', category: 'Laptop', brand: 'Dell' },
            { name: 'PC Gaming QH-Elite 01', price: 25000000, description: 'Core i5-12400F, RTX 3060 Ti', category: 'PC Gaming', brand: 'Asus' },
            { name: 'PC Gaming QH-Elite 02', price: 45000000, description: 'Core i7-13700K, RTX 4070', category: 'PC Gaming', brand: 'MSI' },
            { name: 'Workstation QH-Pro 01', price: 55000000, description: 'Xeon Silver, 64GB ECC, RTX A4000', category: 'Workstation', brand: 'HP' },
            { name: 'Màn hình Dell UltraSharp U2722D', price: 9500000, description: '27 inch 2K IPS', category: 'Screens', brand: 'Dell' },
            { name: 'Chuột Logitech G502 Hero', price: 1200000, description: 'Gaming Mouse 25k DPI', category: 'Gear', brand: 'Logitech' },
            { name: 'Bàn phím cơ Asus ROG Strix Scope', price: 3200000, description: 'RGB Mechanical Keyboard', category: 'Gear', brand: 'Asus' },
            { name: 'Card màn hình MSI RTX 3060 Ventus 2X', price: 8500000, description: '12GB GDDR6', category: 'Components', brand: 'MSI' },
            { name: 'Mainboard Asus ROG Strix Z690-F', price: 7500000, description: 'LGA 1700 DDR5', category: 'Components', brand: 'Asus' },
            { name: 'Router Wifi 6 TP-Link AX10', price: 1500000, description: 'High speed wifi 6', category: 'Network', brand: 'Asus' },
            { name: 'Camera Hikvision 2MP', price: 850000, description: 'IP Camera 1080p', category: 'Camera', brand: 'Samsung' }
        ];

        for (const p of products) {
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
                        stockQuantity: 50
                    })
                });
            }
        }

        console.log('Seeding complete!');
    } catch (error) {
        console.error('Seeding failed:', error.message);
    }
}

seed();
