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

    // Get types
    const types = await db.propertyType.findMany({
      where,
      include: {
        category: withCategory ? true : false,
        ...(withProperties && {
          properties: {
            where: { isActive: true, status: 'AVAILABLE' },
            take: 5, // Include only first 5 properties for performance
          },
        }),
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: types,
    });
  } catch (error) {
    console.error('Error fetching types:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch types' },
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

    // Create type
    const type = await db.propertyType.create({
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

    // Fetch the complete type with relations
    const completeType = await db.propertyType.findUnique({
      where: { id: type.id },
      include: {
        category: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: completeType,
    });
  } catch (error) {
    console.error('Error creating type:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create type' },
      { status: 500 }
    );
  }
}