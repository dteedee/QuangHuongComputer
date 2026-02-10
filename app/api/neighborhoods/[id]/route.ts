import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const neighborhood = await db.neighborhood.findUnique({
      where: { id: params.id },
      include: {
        location: true,
        properties: {
          where: { isActive: true, status: 'AVAILABLE' },
          include: {
            type: true,
            propertyImages: {
              where: { isCover: true },
              take: 1,
            },
          },
          take: 20,
        },
      },
    });

    if (!neighborhood) {
      return NextResponse.json(
        { success: false, error: 'Neighborhood not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: neighborhood,
    });
  } catch (error) {
    console.error('Error fetching neighborhood:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch neighborhood' },
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
      locationId,
    } = body;

    // Update neighborhood
    const neighborhood = await db.neighborhood.update({
      where: { id: params.id },
      data: {
        name,
        nameEn,
        slug,
        description,
        locationId,
        updatedAt: new Date(),
      },
    });

    // Fetch the complete neighborhood with relations
    const completeNeighborhood = await db.neighborhood.findUnique({
      where: { id: params.id },
      include: {
        location: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: completeNeighborhood,
    });
  } catch (error) {
    console.error('Error updating neighborhood:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update neighborhood' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check if neighborhood has properties
    const propertyCount = await db.property.count({
      where: { neighborhoodId: params.id },
    });

    if (propertyCount > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete neighborhood with associated properties' },
        { status: 400 }
      );
    }

    // Delete neighborhood
    await db.neighborhood.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Neighborhood deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting neighborhood:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete neighborhood' },
      { status: 500 }
    );
  }
}