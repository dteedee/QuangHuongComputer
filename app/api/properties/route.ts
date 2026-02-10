import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const locationId = searchParams.get('locationId');
    const type = searchParams.get('type');
    const transactionType = searchParams.get('transactionType');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const minArea = searchParams.get('minArea');
    const maxArea = searchParams.get('maxArea');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      isActive: true,
      status: 'AVAILABLE',
    };

    if (locationId) {
      where.locationId = locationId;
    }

    if (type) {
      where.type = type;
    }

    if (transactionType) {
      where.transactionType = transactionType;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    if (minArea || maxArea) {
      where.area = {};
      if (minArea) where.area.gte = parseFloat(minArea);
      if (maxArea) where.area.lte = parseFloat(maxArea);
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build order clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';

    // Get properties
    const [properties, total] = await Promise.all([
      db.property.findMany({
        where,
        include: {
          location: true,
          neighborhood: true,
          type: true,
          propertyImages: {
            where: { isCover: true },
            take: 1,
          },
          propertyFacilities: {
            include: {
              facility: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.property.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: properties,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch properties' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      titleEn,
      description,
      descriptionEn,
      address,
      type,
      typeId,
      transactionType,
      area,
      price,
      currency,
      bedrooms,
      bathrooms,
      floors,
      yearBuilt,
      furnishingType,
      locationId,
      neighborhoodId,
      latitude,
      longitude,
      contactName,
      contactPhone,
      contactEmail,
      images,
      facilities,
    } = body;

    // Create property
    const property = await db.property.create({
      data: {
        title,
        titleEn,
        slug: `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        description,
        descriptionEn,
        address,
        type,
        typeId,
        transactionType,
        area: parseFloat(area),
        price: parseFloat(price),
        currency: currency || 'VND',
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        floors: floors ? parseInt(floors) : null,
        yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
        furnishingType,
        locationId,
        neighborhoodId,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        contactName,
        contactPhone,
        contactEmail,
        publishedAt: new Date(),
        isActive: true,
        status: 'AVAILABLE',
      },
    });

    // Add property images if provided
    if (images && images.length > 0) {
      await db.propertyImage.createMany({
        data: images.map((img: any, index: number) => ({
          url: img.url,
          alt: img.alt,
          order: index,
          isCover: index === 0,
          propertyId: property.id,
        })),
      });
    }

    // Add property facilities if provided
    if (facilities && facilities.length > 0) {
      await db.propertyFacility.createMany({
        data: facilities.map((facilityId: string) => ({
          propertyId: property.id,
          facilityId,
        })),
      });
    }

    // Fetch the complete property with relations
    const completeProperty = await db.property.findUnique({
      where: { id: property.id },
      include: {
        location: true,
        neighborhood: true,
        type: true,
        propertyImages: true,
        propertyFacilities: {
          include: {
            facility: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: completeProperty,
    });
  } catch (error) {
    console.error('Error creating property:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create property' },
      { status: 500 }
    );
  }
}