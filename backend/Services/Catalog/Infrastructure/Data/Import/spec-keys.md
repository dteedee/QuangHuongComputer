# Specification keys of the seed catalogue (W0-6)

What this file is: the exact, measured shape of the specification data that
`ProductDatasetImporter` writes, so W2-1 (catalogue API / facets) and W2-9 (PC builder) can
build on it without re-deriving it. Everything below was generated from the 68 imported
records on 2026-09-18, not estimated.

## Where the values actually live

| Data | Column | Shape |
|---|---|---|
| Full spec sheet (1504 verified lines) | `Products.Specifications` (jsonb) | `[{ "group", "label", "value", "source" }]` |
| Filter/compare keys | `Products.Attributes.filterAttributes` (jsonb) | `{ "<key>": "<value>" }` |
| Sub-category (facet) | `Products.Attributes.subCategory` | free text, 49 distinct values |
| Marketing bullets | `Products.Attributes.highlights` | string array |
| Rich description | `Products.Attributes.descriptionHtml` | HTML (sanitise before rendering) |

**No `SpecificationGroups` / `SpecificationAttributes` / `ProductSpecificationValues` rows are
created.** The dataset carries **208 distinct free-text group names**, several of them unique to
one product (`"Case - Lian Li LANCOOL 216 RGB White"`, `"CPU - AMD Ryzen 9 9900X3D"`,
`"Quạt tản nhiệt (TL-C12C)"`). Normalising those as-is would add ~200 junk groups and would
break D03's "`SpecificationGroups` = 6, no orphan category" check. The `[{label, value}]` shape
is also what the storefront already parses (`frontend/src/utils/parse-legacy-product-specifications.ts`),
so the data renders today with no frontend change. Promoting a curated subset into the normalised
tables is W2-1's call, with a real key vocabulary behind it.

## The measured key vocabulary

122 distinct keys across 68 products, **66 of which appear exactly once**. They came from the
curation pass, not from a schema, so they are NOT yet a stable vocabulary.

Known collisions and near-duplicates a consumer must handle (all verified present):

| Concept | Keys in use |
|---|---|
| GPU model | `gpu` (17), `gpuModel` (2), `chipset` (VGA rows) |
| CPU | `cpu` (7), `cpuSeries` (12), `cpuGeneration` (2), `series` (2) |
| Core count | `cores` (2), `cpuCores` (2) |
| Screen size | `screenSize` (10, laptops), `size` (7, monitors) |
| PSU wattage | `wattage` (2, PSU SKUs), `psu` (1, a prebuilt PC), `maxWattage` (1, a charger) |
| Connectivity | `connectivity` (12), `connection` (1), `connectionType` (2), `connector` (2) |
| Night vision | `nightVision` (2), `nightVisionM` (1) |

Values are free text in mixed languages and formats (`"16GB DDR5"`, `"16GB"`, `"Có"`, `"true"`,
`"wireless-wifi-2.4ghz"`). **A numeric filter cannot be built on them without a parse+normalise
step.** W2-9's compatibility engine needs `socket`, `ramType`, `formFactor`, `wattage`,
`maxGpuLengthMm` in a typed form - those five are present but only on 2-6 products each, and only
`maxGpuLengthMm` is already numeric. Raised as an integration request to W2-1/W2-9.

## Every key, by how many products use it

| Key | Products | Example categories | Example values |
|---|---|---|---|
| `ram` | 19 | Laptop gaming, MacBook, Laptop mỏng nhẹ cao cấp | 16GB DDR5 · 16GB |
| `gpu` | 17 | Laptop gaming, MacBook, Laptop mỏng nhẹ cao cấp | NVIDIA RTX 4050 6GB · GPU 8 lõi tích hợp (Apple M5) |
| `storage` | 17 | Laptop gaming, MacBook, Laptop mỏng nhẹ cao cấp | 512GB SSD · 512GB SSD |
| `refreshRate` | 14 | Laptop gaming, MacBook, Màn hình đồ họa | 144Hz · 60Hz |
| `connectivity` | 12 | Bàn phím, NVR, Camera IP | Bluetooth 5.0 / 2.4GHz / USB-C · Wired USB |
| `cpuSeries` | 12 | Laptop gaming, MacBook, Laptop mỏng nhẹ cao cấp | Intel Core i5 Gen 13 (i5-13420H) · Apple M5 |
| `resolution` | 10 | Màn hình đồ họa, Màn hình văn phòng, Màn hình 4K | 1920x1080 (Full HD) · 1920x1080 (Full HD) |
| `screenSize` | 10 | Laptop gaming, MacBook, Laptop mỏng nhẹ cao cấp | 15.6 inch · 13.6 inch |
| `purpose` | 9 | Gaming PC - Flagship 4K, PC Gaming 1080p Tầm Trung, PC Gaming 1440p Tầm Trung | Gaming 4K - Flagship · Gaming 1080p |
| `capacity` | 7 | HDD, RAM, External SSD / Storage | 1TB · 16GB |
| `cpu` | 7 | PC Gaming 1080p Tầm Trung, PC Gaming 1440p Tầm Trung, Gaming PC - Upper-Mid 1440p/4K | Intel Core i5-12400F · Intel Core i5-12400F |
| `formFactor` | 7 | Case, HDD, Mainboard | Mid-Tower ATX · 3.5 inch |
| `size` | 7 | Màn hình đồ họa, Màn hình văn phòng, Màn hình 4K | 23.8 inch · 23.8 inch |
| `color` | 6 | Case, Stream, Tai nghe | Trắng · Đen |
| `panel` | 6 | Màn hình đồ họa, Màn hình văn phòng, Màn hình 4K | IPS · IPS |
| `socket` | 6 | CPU, Tản nhiệt, Mainboard | AM5 · Intel 115X/1200/1700/1851, AMD AM4/AM5 |
| `type` | 6 | Tản nhiệt, Loa, Microphone | Tản nhiệt khí (Air Cooler) · Loa kiểm âm 2 kênh |
| `chipset` | 5 | Mainboard, VGA | Intel Z890 · AMD X870 |
| `switchType` | 5 | Bàn phím, Network Switch, Chuột | Linear · Optical ROG RX Red |
| `interface` | 4 | HDD, External SSD / Storage, SSD | SATA III · USB 3.2 Gen 2 (10Gbps) |
| `wifiStandard` | 4 | Mesh WiFi System, Router WiFi, USB WiFi Adapter | WiFi 6 (AX6600) · Wi-Fi 6 (802.11ax) |
| `buttons` | 3 | Chuột | 11 · 4 |
| `fanSize` | 3 | Laptop Cooling Pad, Tản nhiệt, PSU | 160mm · 120mm |
| `layout` | 3 | Bàn phím | 65% · Full-size 104 phím |
| `portCount` | 3 | Laptop Charger / Power Adapter, Network Switch, USB-C Hub / Docking Station | 3 · 8 |
| `vram` | 3 | VGA | 8GB GDDR7 · 16GB GDDR7 |
| `weight` | 3 | Chuột, Laptop Backpack | 121g · 63g |
| `antennas` | 2 | Router WiFi, USB WiFi Adapter | 6 ăng-ten ngoài · 2 ăng-ten ngoài độ lợi cao |
| `backlight` | 2 | Bàn phím | RGB per-key (Aura Sync) · RGB |
| `bandType` | 2 | Router WiFi, USB WiFi Adapter | Băng tần kép (Dual-Band) · Băng tần kép (Dual-Band) |
| `cameraType` | 2 | Camera IP | Bullet (thân trụ) · indoor-pan-tilt |
| `compatibility` | 2 | Laptop Cooling Pad, Tai nghe | Laptop đến 17 inch · PC |
| `connectionType` | 2 | Loa, Tai nghe | TRS 6.35mm, RCA, AUX 3.5mm · wired |
| `connector` | 2 | Tai nghe, USB WiFi Adapter | 3.5mm · USB 3.0 |
| `cores` | 2 | CPU | 8 Nhân / 16 Luồng · 20 (8P+12E) |
| `cpuCores` | 2 | Gaming PC - Flagship 4K, Gaming PC - High-End 4K | 8 cores · 8 cores |
| `cpuGeneration` | 2 | Gaming PC - Flagship 4K, Gaming PC - High-End 4K | Ryzen 9000 Series (Zen 5, 3D V-Cache) · Ryzen 9000 Series (Zen 5, 3D V-Cache) |
| `design` | 2 | Tản nhiệt, Chuột | Tháp đôi (Dual Tower) · Ambidextrous |
| `dpiMax` | 2 | Chuột | 25600 · 30000 |
| `gpuModel` | 2 | Gaming PC - Flagship 4K, Gaming PC - High-End 4K | NVIDIA GeForce RTX 5080 · AMD Radeon RX 9070 XT |
| `gpuVram` | 2 | Gaming PC - Flagship 4K, Gaming PC - High-End 4K | 16GB · 16GB |
| `hotSwap` | 2 | Bàn phím | 5-pin · Có |
| `material` | 2 | Case, Laptop Backpack | Thép/Kính cường lực · Polyester chống thấm nước |
| `maxGpuLengthMm` | 2 | Case | 392 · 410 |
| `modular` | 2 | PSU | Full Modular · Full Modular |
| `nightVision` | 2 | Camera IP | 10m · Có màu (Starlight) |
| `portType` | 2 | Laptop Charger / Power Adapter, Laptop Cooling Pad | 2x USB-C + 1x USB-A · 3x USB 2.0 + 1x USB-C |
| `priceRange` | 2 | Gaming PC - Flagship 4K, Gaming PC - High-End 4K | 111-112 triệu VND · 68-69 triệu VND |
| `ramType` | 2 | Mainboard | DDR5 · DDR5 |
| `rating` | 2 | PSU | Cybenetics Gold · 80 Plus Gold |
| `sensor` | 2 | Chuột | HERO 25K · PAW3220 |
| `series` | 2 | CPU | AMD Ryzen 7 9000 Series (Granite Ridge) · Intel Core Ultra Series 2 (Arrow Lake-S) |
| `speed` | 2 | RAM | 3200MHz · 5600MHz |
| `speedClass` | 2 | Router WiFi, USB WiFi Adapter | AX5400 · AX1800 |
| `wanPort` | 2 | Mesh WiFi System, Router WiFi | 2.5G · 1x Gigabit WAN |
| `wattage` | 2 | PSU | 750W · 850W |
| `band` | 1 | Range Extender WiFi | Dual-band (2.4GHz + 5GHz) |
| `bandCount` | 1 | Mesh WiFi System | Tri-band (3 băng tần) |
| `base` | 1 | Lót chuột | Cao su chống trượt |
| `batteryType` | 1 | Chuột | 1x AA |
| `cardReader` | 1 | USB-C Hub / Docking Station | SD + TF (104MB/s) |
| `caseType` | 1 | Case | Mid Tower |
| `channels` | 1 | NVR | 8 |
| `chargerType` | 1 | Laptop Charger / Power Adapter | GaN Fast Charger |
| `connection` | 1 | Stream | USB-C |
| `coverageArea` | 1 | Mesh WiFi System | 510m2 |
| `dpi` | 1 | Chuột | 800-2400 |
| `driverSize` | 1 | Tai nghe | 50mm |
| `fanSpeed` | 1 | Laptop Cooling Pad | 1000 RPM |
| `features` | 1 | Microphone | rgb_led,tap_to_mute,gain_knob |
| `frequencyResponse` | 1 | Loa | 60Hz-20kHz |
| `hasNumpad` | 1 | Bàn phím | true |
| `hddSupport` | 1 | NVR | sata-3.5-1tb-8tb |
| `hdmiOutput` | 1 | USB-C Hub / Docking Station | 4K@60Hz |
| `heatpipes` | 1 | Tản nhiệt | 6 |
| `includedFans` | 1 | Case | 2x160mm ARGB + 1x140mm PWM |
| `ipRating` | 1 | Camera IP | IP67 |
| `keycapMaterial` | 1 | Bàn phím | PBT Double-Shot |
| `keyCount` | 1 | Bàn phím | 68 |
| `keys` | 1 | Stream | 8 |
| `lanPorts` | 1 | Router WiFi | 4x Gigabit LAN |
| `lanSpeed` | 1 | USB-C Hub / Docking Station | Gigabit (10/100/1000Mbps) |
| `laptopSize` | 1 | Laptop Backpack | Đến 17.3 inch |
| `lensMm` | 1 | Camera IP | 4mm |
| `mainboard` | 1 | Workstation - 3D Render | AM5 X870 |
| `maxFps` | 1 | Webcam | 60 |
| `maxRadiatorFront` | 1 | Case | 360mm |
| `maxResolution` | 1 | NVR | 3k-5mp |
| `maxSpeed` | 1 | Range Extender WiFi | AX1500 |
| `maxWattage` | 1 | Laptop Charger / Power Adapter | 100W |
| `meshSupport` | 1 | Range Extender WiFi | OneMesh |
| `meshTech` | 1 | Mesh WiFi System | AiMesh |
| `mic` | 1 | Webcam | stereo_builtin |
| `motherboardSupport` | 1 | Case | E-ATX/ATX/Micro-ATX/Mini-ITX |
| `mount` | 1 | Webcam | clip_tripod |
| `networkProtocol` | 1 | NVR | onvif |
| `nightVisionM` | 1 | Camera IP | 30 |
| `noiseLevel` | 1 | Laptop Cooling Pad | 26 dBA |
| `os` | 1 | Stream | windows-macos |
| `packSize` | 1 | Mesh WiFi System | 2-Pack |
| `pdWattage` | 1 | USB-C Hub / Docking Station | 100W |
| `placement` | 1 | Camera IP | Ngoài trời |
| `polarPatterns` | 1 | Microphone | cardioid_omni_bidirectional_stereo |
| `ports` | 1 | Range Extender WiFi | 1x Gigabit LAN/WAN |
| `powerDelivery` | 1 | Laptop Charger / Power Adapter | PD 3.0 / PPS |
| `psu` | 1 | Gaming PC - Upper-Mid 1440p/4K | 750W 80 Plus Gold |
| `ptz` | 1 | Camera IP | Có (Pan 360° / Tilt 135.5°) |
| `radiatorSupportMm` | 1 | Case | 360 |
| `rgb` | 1 | Chuột | LIGHTSYNC RGB |
| `rpm` | 1 | HDD | 7200 |
| `sensorType` | 1 | Chuột | Optical - Focus Pro 30K |
| `sidePanel` | 1 | Case | Kính cường lực |
| `speedStandard` | 1 | Network Switch | Gigabit 10/100/1000Mbps |
| `storageSupport` | 1 | Camera IP | microsd-256gb-nvr |
| `surface` | 1 | Lót chuột | Vải dệt mịn (Micro-woven cloth) |
| `surroundSound` | 1 | Tai nghe | DTS Headphone:X |
| `technology` | 1 | Laptop Charger / Power Adapter | GaN II |
| `thickness` | 1 | Lót chuột | 6mm |
| `totalPowerW` | 1 | Loa | 42 |
| `usbPorts` | 1 | Router WiFi | 1x USB 3.0 |
| `usbStandard` | 1 | USB-C Hub / Docking Station | USB 3.0 (5Gbps) |
| `videoOutput` | 1 | NVR | hdmi-vga |
