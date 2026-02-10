import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // Seed Province data
  const provinces = [
    { name: 'Hà Nội', nameEn: 'Hanoi', code: '01' },
    { name: 'TP. Hồ Chí Minh', nameEn: 'Ho Chi Minh City', code: '79' },
    { name: 'Đà Nẵng', nameEn: 'Da Nang', code: '48' },
    { name: 'Bình Dương', nameEn: 'Binh Duong', code: '30' },
    { name: 'Đồng Nai', nameEn: 'Dong Nai', code: '31' },
  ];

  const createdProvinces = await Promise.all(
    provinces.map(province =>
      prisma.province.upsert({
        where: { code: province.code },
        update: {},
        create: {
          id: uuidv4(),
          ...province,
        },
      })
    )
  );

  // Seed District data
  const districts = [
    // Hanoi districts
    { name: 'Ba Đình', nameEn: 'Ba Dinh', code: '001', provinceId: createdProvinces[0].id },
    { name: 'Hoàn Kiếm', nameEn: 'Hoan Kiem', code: '002', provinceId: createdProvinces[0].id },
    { name: 'Tây Hồ', nameEn: 'West Lake', code: '003', provinceId: createdProvinces[0].id },
    { name: 'Cầu Giấy', nameEn: 'Cau Giay', code: '004', provinceId: createdProvinces[0].id },
    { name: 'Hai Bà Trưng', nameEn: 'Hoang Ba Trung', code: '005', provinceId: createdProvinces[0].id },
    
    // Ho Chi Minh City districts
    { name: 'Quận 1', nameEn: 'District 1', code: '001', provinceId: createdProvinces[1].id },
    { name: 'Quận 2', nameEn: 'District 2', code: '002', provinceId: createdProvinces[1].id },
    { name: 'Quận 3', nameEn: 'District 3', code: '003', provinceId: createdProvinces[1].id },
    { name: 'Quận 7', nameEn: 'District 7', code: '007', provinceId: createdProvinces[1].id },
    { name: 'Quận Bình Thạnh', nameEn: 'Binh Thanh District', code: '013', provinceId: createdProvinces[1].id },
  ];

  const createdDistricts = await Promise.all(
    districts.map(district =>
      prisma.district.upsert({
        where: { 
          provinceId_code: { 
            provinceId: district.provinceId, 
            code: district.code 
          } 
        },
        update: {},
        create: {
          id: uuidv4(),
          ...district,
        },
      })
    )
  );

  // Seed Ward data
  const wards = [
    // Hanoi wards
    { name: 'Phúc Xá', nameEn: 'Phu Xa', code: '001', districtId: createdDistricts[0].id },
    { name: 'Đội Cấn', nameEn: 'Doi Can', code: '002', districtId: createdDistricts[0].id },
    { name: 'Hàng Bài', nameEn: 'Hang Bai', code: '001', districtId: createdDistricts[1].id },
    { name: 'Cửa Đông', nameEn: 'Cua Dong', code: '002', districtId: createdDistricts[1].id },
    
    // Ho Chi Minh City wards
    { name: 'Bến Nghé', nameEn: 'Ben Nhe', code: '001', districtId: createdDistricts[5].id },
    { name: 'Bến Thành', nameEn: 'Ben Thanh', code: '002', districtId: createdDistricts[5].id },
    { name: 'Thảo Điền', nameEn: 'Thao Dien', code: '001', districtId: createdDistricts[6].id },
  ];

  const createdWards = await Promise.all(
    wards.map(ward =>
      prisma.ward.upsert({
        where: { 
          districtId_code: { 
            districtId: ward.districtId, 
            code: ward.code 
          } 
        },
        update: {},
        create: {
          id: uuidv4(),
          ...ward,
        },
      })
    )
  );

  // Seed Location data
  const locations = [
    {
      name: 'Hà Nội',
      nameEn: 'Hanoi',
      slug: 'ha-noi',
      description: 'Thủ đô của Việt Nam',
      provinceId: createdProvinces[0].id,
      latitude: 21.0278,
      longitude: 105.8342,
    },
    {
      name: 'TP. Hồ Chí Minh',
      nameEn: 'Ho Chi Minh City',
      slug: 'ho-chi-minh',
      description: 'Thành phố lớn nhất Việt Nam',
      provinceId: createdProvinces[1].id,
      latitude: 10.7626,
      longitude: 106.6602,
    },
    {
      name: 'Đà Nẵng',
      nameEn: 'Da Nang',
      slug: 'da-nang',
      description: 'Thành phố biển miền Trung',
      provinceId: createdProvinces[2].id,
      latitude: 16.0681,
      longitude: 108.2208,
    },
  ];

  const createdLocations = await Promise.all(
    locations.map(location =>
      prisma.location.upsert({
        where: { slug: location.slug },
        update: {},
        create: {
          id: uuidv4(),
          ...location,
        },
      })
    )
  );

  // Seed Property Type Categories
  const propertyTypeCategories = [
    {
      name: 'Nhà ở',
      nameEn: 'Housing',
      description: 'Các loại nhà ở dân dụng',
      icon: 'home',
    },
    {
      name: 'Bất động sản thương mại',
      nameEn: 'Commercial Real Estate',
      description: 'Các loại bất động sản thương mại',
      icon: 'business',
    },
  ];

  const createdPropertyTypeCategories = await Promise.all(
    propertyTypeCategories.map(category =>
      prisma.propertyTypeCategory.upsert({
        where: { name: category.name },
        update: {},
        create: {
          id: uuidv4(),
          ...category,
        },
      })
    )
  );

  // Seed Property Types
  const propertyTypes = [
    { name: 'Căn hộ', nameEn: 'Apartment', slug: 'apartment', categoryId: createdPropertyTypeCategories[0].id },
    { name: 'Nhà riêng', nameEn: 'House', slug: 'house', categoryId: createdPropertyTypeCategories[0].id },
    { name: 'Biệt thự', nameEn: 'Villa', slug: 'villa', categoryId: createdPropertyTypeCategories[0].id },
    { name: 'Penthouse', nameEn: 'Penthouse', slug: 'penthouse', categoryId: createdPropertyTypeCategories[0].id },
    { name: 'Văn phòng', nameEn: 'Office', slug: 'office', categoryId: createdPropertyTypeCategories[1].id },
    { name: 'Cửa hàng', nameEn: 'Retail Shop', slug: 'retail-shop', categoryId: createdPropertyTypeCategories[1].id },
  ];

  await Promise.all(
    propertyTypes.map(type =>
      prisma.propertyType.upsert({
        where: { slug: type.slug },
        update: {},
        create: {
          id: uuidv4(),
          ...type,
        },
      })
    )
  );

  // Seed Facility Categories
  const facilityCategories = [
    {
      name: 'Tiện ích cơ bản',
      nameEn: 'Basic Amenities',
      description: 'Tiện ích cơ bản cho sinh hoạt',
      icon: 'wifi',
    },
    {
      name: 'An ninh',
      nameEn: 'Security',
      description: 'Tiện ích về an ninh',
      icon: 'shield',
    },
    {
      name: 'Giải trí',
      nameEn: 'Recreation',
      description: 'Tiện ích giải trí',
      icon: 'sports_soccer',
    },
  ];

  const createdFacilityCategories = await Promise.all(
    facilityCategories.map(category =>
      prisma.facilityCategory.upsert({
        where: { name: category.name },
        update: {},
        create: {
          id: uuidv4(),
          ...category,
        },
      })
    )
  );

  // Seed Facilities
  const facilities = [
    { name: 'Internet', nameEn: 'Internet', slug: 'internet', categoryId: createdFacilityCategories[0].id },
    { name: 'Ti vi', nameEn: 'TV', slug: 'tv', categoryId: createdFacilityCategories[0].id },
    { name: 'Máy lạnh', nameEn: 'Air Conditioner', slug: 'air-conditioner', categoryId: createdFacilityCategories[0].id },
    { name: 'Máy giặt', nameEn: 'Washing Machine', slug: 'washing-machine', categoryId: createdFacilityCategories[0].id },
    { name: 'Hồ bơi', nameEn: 'Swimming Pool', slug: 'swimming-pool', categoryId: createdFacilityCategories[2].id },
    { name: 'Phòng gym', nameEn: 'Gym', slug: 'gym', categoryId: createdFacilityCategories[2].id },
    { name: 'Hệ thống an ninh', nameEn: 'Security System', slug: 'security-system', categoryId: createdFacilityCategories[1].id },
    { name: 'Hầm để xe', nameEn: 'Parking', slug: 'parking', categoryId: createdFacilityCategories[1].id },
  ];

  await Promise.all(
    facilities.map(facility =>
      prisma.facility.upsert({
        where: { slug: facility.slug },
        update: {},
        create: {
          id: uuidv4(),
          ...facility,
        },
      })
    )
  );

  // Seed Neighborhoods
  const neighborhoods = [
    {
      name: 'Hồ Tây',
      nameEn: 'West Lake',
      slug: 'ho-tay',
      description: 'Khu vực quanh Hồ Tây đẹp nhất Hà Nội',
      locationId: createdLocations[0].id,
    },
    {
      name: 'Thảo Điền',
      nameEn: 'Thao Dien',
      slug: 'thao-dien',
      description: 'Khu vực cao cấp tại TP. Hồ Chí Minh',
      locationId: createdLocations[1].id,
    },
    {
      name: 'Ngũ Hành Sơn',
      nameEn: 'Ngu Hanh Son',
      slug: 'ngu-hanh-son',
      description: 'Khu vực biển Đà Nẵng',
      locationId: createdLocations[2].id,
    },
  ];

  await Promise.all(
    neighborhoods.map(neighborhood =>
      prisma.neighborhood.upsert({
        where: { slug: neighborhood.slug },
        update: {},
        create: {
          id: uuidv4(),
          ...neighborhood,
        },
      })
    )
  );

  // Seed Properties
  const propertyData = [
    {
      title: 'Căn hộ cao cấp Hồ Tây',
      titleEn: 'Premium West Lake Apartment',
      slug: 'can-hao-cao-cap-ho-tay',
      description: 'Căn hộ view hồ Tây tuyệt đẹp, nội thất cao cấp',
      descriptionEn: 'Beautiful West Lake view apartment with premium interior',
      address: 'Số 1 Hồ Tây, Ba Đình, Hà Nội',
      districtId: createdDistricts[0].id,
      wardId: createdWards[0].id,
      type: 'APARTMENT',
      typeId: 'apartment',
      transactionType: 'RENT',
      area: 85,
      price: 25000000,
      bedrooms: 2,
      bathrooms: 1,
      yearBuilt: 2022,
      furnishingType: 'FULLY_FURNISHED',
      locationId: createdLocations[0].id,
      neighborhoodId: 'ho-tay',
      latitude: 21.035,
      longitude: 105.83,
      contactName: 'Nguyễn Văn A',
      contactPhone: '0912345678',
      contactEmail: 'nguyenvana@example.com',
    },
    {
      title: 'Biệt thự Thảo Điền',
      titleEn: 'Thao Dien Villa',
      slug: 'biet-thu-thao-dien',
      description: 'Biệt thự 3 tầng khu Thảo Điền, view sông Sài Gòn',
      descriptionEn: '3-storey villa in Thao Dien area with Saigon river view',
      address: 'Số 10 Thảo Điền, Quận 2, TP. Hồ Chí Minh',
      districtId: createdDistricts[6].id,
      wardId: createdWards[6].id,
      type: 'VILLA',
      typeId: 'villa',
      transactionType: 'SELL',
      area: 350,
      price: 85000000000,
      bedrooms: 5,
      bathrooms: 4,
      floors: 3,
      yearBuilt: 2021,
      furnishingType: 'FULLY_FURNISHED',
      locationId: createdLocations[1].id,
      neighborhoodId: 'thao-dien',
      latitude: 10.77,
      longitude: 106.73,
      contactName: 'Trần Thị B',
      contactPhone: '0923456789',
      contactEmail: 'tranthib@example.com',
    },
    {
      title: 'Văn phòng quận 1',
      titleEn: 'Office in District 1',
      slug: 'van-phong-quan-1',
      description: 'Văn phòng cho thuê trung tâm quận 1',
      descriptionEn: 'Office for rent in central District 1',
      address: 'Số 23 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
      districtId: createdDistricts[5].id,
      wardId: createdWards[1].id,
      type: 'OFFICE',
      typeId: 'office',
      transactionType: 'RENT',
      area: 150,
      price: 45000000,
      bedrooms: 0,
      bathrooms: 2,
      yearBuilt: 2020,
      locationId: createdLocations[1].id,
      contactName: 'Lê Văn C',
      contactPhone: '0934567890',
      contactEmail: 'levanc@example.com',
    },
    {
      title: 'Nhà phố Hà Nội',
      titleEn: 'Hanoi Townhouse',
      slug: 'nha-pho-ha-noi',
      description: 'Nhà phố 4 tầng, mặt tiền phố lớn',
      descriptionEn: '4-storey townhouse on large street',
      address: 'Số 56 Phố Đinh Tiên Hoàng, Hoàn Kiếm, Hà Nội',
      districtId: createdDistricts[1].id,
      type: 'HOUSE',
      typeId: 'house',
      transactionType: 'SELL',
      area: 120,
      price: 45000000000,
      bedrooms: 4,
      bathrooms: 3,
      floors: 4,
      yearBuilt: 2019,
      locationId: createdLocations[0].id,
      neighborhoodId: 'hoan-kiem',
      latitude: 21.027,
      longitude: 105.85,
      contactName: 'Phạm Thị D',
      contactPhone: '0945678901',
      contactEmail: 'phamthid@example.com',
    },
    {
      title: 'Penthouse biển Đà Nẵng',
      titleEn: 'Da Nang Beach Penthouse',
      slug: 'penthouse-bien-da-nang',
      description: 'Penthouse view biển, tầng thượng cao nhất',
      descriptionEn: 'Beach view penthouse on the highest floor',
      address: 'Số 1 Phạm Văn Đồng, Hải Châu, Đà Nẵng',
      type: 'PENTHOUSE',
      typeId: 'penthouse',
      transactionType: 'RENT',
      area: 200,
      price: 50000000,
      bedrooms: 3,
      bathrooms: 3,
      yearBuilt: 2023,
      furnishingType: 'FULLY_FURNISHED',
      locationId: createdLocations[2].id,
      neighborhoodId: 'ngu-hanh-son',
      latitude: 16.08,
      longitude: 108.27,
      contactName: 'Hoàng Văn E',
      contactPhone: '0956789012',
      contactEmail: 'hoangvane@example.com',
    },
  ];

  const createdProperties = await Promise.all(
    propertyData.map(property =>
      prisma.property.upsert({
        where: { slug: property.slug },
        update: {},
        create: {
          id: uuidv4(),
          ...property,
          publishedAt: new Date(),
        },
      })
    )
  );

  // Property images
  const propertyImages = [
    {
      propertyId: createdProperties[0].id,
      images: [
        { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c', alt: 'Living room' },
        { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c', alt: 'Kitchen' },
        { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c', alt: 'Bedroom' },
      ],
    },
    {
      propertyId: createdProperties[1].id,
      images: [
        { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c', alt: 'Exterior' },
        { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c', alt: 'Pool' },
        { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c', alt: 'Garden' },
      ],
    },
  ];

  for (const propertyImage of propertyImages) {
    for (const [index, image] of propertyImage.images.entries()) {
      await prisma.propertyImage.create({
        data: {
          id: uuidv4(),
          url: image.url,
          alt: image.alt,
          order: index,
          isCover: index === 0,
          propertyId: propertyImage.propertyId,
        },
      });
    }
  }

  // Property facilities
  const propertyFacilitiesData = [
    {
      propertyId: createdProperties[0].id,
      facilitySlugs: ['internet', 'tv', 'air-conditioner', 'security-system'],
    },
    {
      propertyId: createdProperties[1].id,
      facilitySlugs: ['swimming-pool', 'gym', 'parking', 'security-system'],
    },
    {
      propertyId: createdProperties[2].id,
      facilitySlugs: ['internet', 'parking', 'air-conditioner'],
    },
  ];

  for (const propertyFacility of propertyFacilitiesData) {
    const facilities = await prisma.facility.findMany({
      where: { slug: { in: propertyFacility.facilitySlugs } },
    });

    for (const facility of facilities) {
      await prisma.propertyFacility.upsert({
        where: {
          propertyId_facilityId: {
            propertyId: propertyFacility.propertyId,
            facilityId: facility.id,
          },
        },
        update: {},
        create: {
          id: uuidv4(),
          propertyId: propertyFacility.propertyId,
          facilityId: facility.id,
        },
      });
    }
  }

  // Seed User
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      id: uuidv4(),
      username: 'admin',
      email: 'admin@example.com',
      password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
      name: 'Administrator',
      role: 'ADMIN',
    },
  });

  console.log('✅ Database seeded successfully!');
}

seed()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });