import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const location = await db.location.findUnique({
      where: { id: params.id },
      include: {
        province: true,
        district: true,
        ward: true,
        neighborhoods: {
          include: {
            properties: {
              where: { isActive: true, status: 'AVAILABLE' },
              take: 10,
            },
          },
        },
        properties: {
          where: { isActive: true, status: 'AVAILABLE' },
          take: 20,
        },
      },
    });

    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: location,
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch location' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Update location
    const location = await db.location.update({
      where: { id: params.id },
      data: {
        name,
        nameEn,
        slug,
        description,
        provinceId,
        districtId,
        wardId,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        provinceCode,
        districtCode,
        wardCode,
        metaTitle,
        metaDesc,
        updatedAt: new Date(),
      },
    });

    // Fetch the complete location with relations
    const completeLocation = await db.location.findUnique({
      where: { id: params.id },
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
    console.error('Error updating location:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update location' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check if location has properties
    const propertyCount = await db.property.count({
      where: { locationId: params.id },
    });

    if (propertyCount > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete location with associated properties' },
        { status: 400 }
      );
    }

    // Delete location
    await db.location.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Location deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting location:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete location' },
      { status: 500 }
    );
  }
}