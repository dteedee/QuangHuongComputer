import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const categoryId = searchParams.get('categoryId');
    const withCategory = searchParams.get('withCategory') === 'true';
    const withProperties = searchParams.get('withProperties') === 'true';

    // Build where clause
    const where: any = { isActive: true };
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameEn: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Get facilities
    const facilities = await db.facility.findMany({
      where,
      include: {
        category: withCategory ? true : false,
        ...(withProperties && {
          propertyFacilities: {
            include: {
              property: {
                where: { isActive: true, status: 'AVAILABLE' },
              },
            },
          },
        }),
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: facilities,
    });
  } catch (error) {
    console.error('Error fetching facilities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch facilities' },
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
      categoryId,
      icon,
    } = body;

    // Create facility
    const facility = await db.facility.create({
      data: {
        name,
        nameEn,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        description,
        categoryId,
        icon,
        isActive: true,
      },
    });

    // Fetch the complete facility with relations
    const completeFacility = await db.facility.findUnique({
      where: { id: facility.id },
      include: {
        category: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: completeFacility,
    });
  } catch (error) {
    console.error('Error creating facility:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create facility' },
      { status: 500 }
    );
  }
}