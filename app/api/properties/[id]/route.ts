import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const property = await db.property.findUnique({
      where: { id: params.id },
      include: {
        location: true,
        neighborhood: true,
        type: true,
        propertyImages: {
          orderBy: { order: 'asc' },
        },
        propertyFacilities: {
          include: {
            facility: true,
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: property,
    });
  } catch (error) {
    console.error('Error fetching property:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch property' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Update property
    const property = await db.property.update({
      where: { id: params.id },
      data: {
        title,
        titleEn,
        description,
        descriptionEn,
        address,
        type,
        typeId,
        transactionType,
        area: area ? parseFloat(area) : undefined,
        price: price ? parseFloat(price) : undefined,
        currency,
        bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
        bathrooms: bathrooms ? parseInt(bathrooms) : undefined,
        floors: floors ? parseInt(floors) : undefined,
        yearBuilt: yearBuilt ? parseInt(yearBuild) : undefined,
        furnishingType,
        locationId,
        neighborhoodId,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        contactName,
        contactPhone,
        contactEmail,
        updatedAt: new Date(),
      },
    });

    // Update images if provided
    if (images !== undefined) {
      // Delete existing images
      await db.propertyImage.deleteMany({
        where: { propertyId: params.id },
      });

      // Add new images
      if (images.length > 0) {
        await db.propertyImage.createMany({
          data: images.map((img: any, index: number) => ({
            url: img.url,
            alt: img.alt,
            order: index,
            isCover: index === 0,
            propertyId: params.id,
          })),
        });
      }
    }

    // Update facilities if provided
    if (facilities !== undefined) {
      // Delete existing facilities
      await db.propertyFacility.deleteMany({
        where: { propertyId: params.id },
      });

      // Add new facilities
      if (facilities.length > 0) {
        await db.propertyFacility.createMany({
          data: facilities.map((facilityId: string) => ({
            propertyId: params.id,
            facilityId,
          })),
        });
      }
    }

    // Fetch the complete property with relations
    const completeProperty = await db.property.findUnique({
      where: { id: params.id },
      include: {
        location: true,
        neighborhood: true,
        type: true,
        propertyImages: {
          orderBy: { order: 'asc' },
        },
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
    console.error('Error updating property:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update property' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Soft delete by setting isActive to false
    await db.property.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Property deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting property:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete property' },
      { status: 500 }
    );
  }
}