import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const locationId = searchParams.get('locationId');
    const withLocation = searchParams.get('withLocation') === 'true';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameEn: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (locationId) {
      where.locationId = locationId;
    }

    // Get neighborhoods
    const [neighborhoods, total] = await Promise.all([
      db.neighborhood.findMany({
        where,
        include: {
          location: withLocation ? true : false,
          properties: {
            where: { isActive: true, status: 'AVAILABLE' },
            take: 5, // Include only first 5 properties for performance
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      db.neighborhood.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: neighborhoods,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching neighborhoods:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch neighborhoods' },
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
      locationId,
    } = body;

    // Create neighborhood
    const neighborhood = await db.neighborhood.create({
      data: {
        name,
        nameEn,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        description,
        locationId,
      },
    });

    // Fetch the complete neighborhood with relations
    const completeNeighborhood = await db.neighborhood.findUnique({
      where: { id: neighborhood.id },
      include: {
        location: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: completeNeighborhood,
    });
  } catch (error) {
    console.error('Error creating neighborhood:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create neighborhood' },
      { status: 500 }
    );
  }
}