import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const provinceId = searchParams.get('provinceId');
    const withDistricts = searchParams.get('withDistricts') === 'true';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameEn: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (provinceId) {
      where.provinceId = provinceId;
    }

    // Get locations
    const [locations, total] = await Promise.all([
      db.location.findMany({
        where,
        include: {
          province: true,
          district: true,
          ward: true,
          ...(withDistricts && {
            districts: {
              include: {
                wards: true,
              },
            },
          }),
          properties: {
            where: { isActive: true, status: 'AVAILABLE' },
            take: 5, // Include only first 5 properties for performance
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      db.location.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: locations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      nameEn,
      slug,
      description,
      provinceId,
      districtId,
      wardId,
      latitude,
      longitude,
      provinceCode,
      districtCode,
      wardCode,
      metaTitle,
      metaDesc,
    } = body;

    // Create location
    const location = await db.location.create({
      data: {
        name,
        nameEn,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        description,
        provinceId,
        districtId,
        wardId,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        provinceCode,
        districtCode,
        wardCode,
        metaTitle,
        metaDesc,
      },
    });

    // Fetch the complete location with relations
    const completeLocation = await db.location.findUnique({
      where: { id: location.id },
      include: {
        province: true,
        district: true,
        ward: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: completeLocation,
    });
  } catch (error) {
    console.error('Error creating location:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create location' },
      { status: 500 }
    );
  }
}