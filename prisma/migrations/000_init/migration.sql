-- Create tables
CREATE TABLE "PropertyTypeCategory" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "nameEn" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "icon" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "PropertyType" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "categoryId" TEXT NOT NULL,
  "icon" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PropertyTypeCategory" ("id") ON DELETE CASCADE
);

CREATE TABLE "FacilityCategory" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "nameEn" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "icon" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Facility" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "icon" TEXT,
  "categoryId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FacilityCategory" ("id") ON DELETE CASCADE
);

CREATE TABLE "Province" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "nameEn" TEXT NOT NULL UNIQUE,
  "code" TEXT NOT NULL UNIQUE,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "District" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "provinceId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province" ("id") ON DELETE CASCADE,
  CONSTRAINT "District_provinceId_code_key" UNIQUE ("provinceId", "code")
);

CREATE TABLE "Ward" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "districtId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District" ("id") ON DELETE CASCADE,
  CONSTRAINT "Ward_districtId_code_key" UNIQUE ("districtId", "code")
);

CREATE TABLE "Location" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "nameEn" TEXT NOT NULL UNIQUE,
  "slug" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "provinceId" TEXT,
  "districtId" TEXT,
  "wardId" TEXT,
  "latitude" REAL,
  "longitude" REAL,
  "provinceCode" TEXT,
  "districtCode" TEXT,
  "wardCode" TEXT,
  "metaTitle" TEXT,
  "metaDesc" TEXT,
  "provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province" ("id") ON DELETE SET NULL,
  "districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District" ("id") ON DELETE SET NULL,
  "wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward" ("id") ON DELETE SET NULL
);

CREATE TABLE "Neighborhood" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "locationId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE
);

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "name" TEXT,
  "avatar" TEXT,
  "role" TEXT NOT NULL DEFAULT 'USER',
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Property" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "description" TEXT NOT NULL,
  "descriptionEn" TEXT NOT NULL,
  "address" TEXT,
  "districtId" TEXT,
  "wardId" TEXT,
  "type" TEXT NOT NULL,
  "typeId" TEXT NOT NULL,
  "transactionType" TEXT NOT NULL,
  "area" REAL NOT NULL,
  "price" REAL NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'VND',
  "bedrooms" INTEGER,
  "bathrooms" INTEGER,
  "floors" INTEGER,
  "bedroomsCount" INTEGER,
  "bathroomsCount" INTEGER,
  "maxOccupancy" INTEGER,
  "yearBuilt" INTEGER,
  "furnishingType" TEXT,
  "locationId" TEXT NOT NULL,
  "neighborhoodId" TEXT,
  "latitude" REAL,
  "longitude" REAL,
  "contactName" TEXT,
  "contactPhone" TEXT,
  "contactEmail" TEXT,
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "metaTitle" TEXT,
  "metaDesc" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" DATETIME,
  "locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE,
  "neighborhoodId_fkey" FOREIGN KEY ("neighborhoodId") REFERENCES "Neighborhood" ("id") ON DELETE SET NULL,
  "typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "PropertyType" ("id") ON DELETE CASCADE,
  "districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District" ("id") ON DELETE SET NULL,
  "wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward" ("id") ON DELETE SET NULL
);

CREATE TABLE "PropertyImage" (
  "id" TEXT PRIMARY KEY,
  "url" TEXT NOT NULL,
  "alt" TEXT,
  "caption" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "isCover" BOOLEAN NOT NULL DEFAULT FALSE,
  "propertyId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE
);

CREATE TABLE "PropertyFacility" (
  "id" TEXT PRIMARY KEY,
  "propertyId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE,
  "facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE CASCADE,
  CONSTRAINT "PropertyFacility_propertyId_facilityId_key" UNIQUE ("propertyId", "facilityId")
);

-- Create indexes
CREATE INDEX "idx_property_type_category_id" ON "PropertyType" ("categoryId");
CREATE INDEX "idx_facility_category_id" ON "Facility" ("categoryId");
CREATE INDEX "idx_location_province_id" ON "Location" ("provinceId");
CREATE INDEX "idx_location_district_id" ON "Location" ("districtId");
CREATE INDEX "idx_location_ward_id" ON "Location" ("wardId");
CREATE INDEX "idx_property_location_id" ON "Property" ("locationId");
CREATE INDEX "idx_property_type_id" ON "Property" ("typeId");
CREATE INDEX "idx_property_neighborhood_id" ON "Property" ("neighborhoodId");
CREATE INDEX "idx_property_district_id" ON "Property" ("districtId");
CREATE INDEX "idx_property_ward_id" ON "Property" ("wardId");
CREATE INDEX "idx_property_image_property_id" ON "PropertyImage" ("propertyId");
CREATE INDEX "idx_property_facility_property_id" ON "PropertyFacility" ("propertyId");
CREATE INDEX "idx_property_facility_facility_id" ON "PropertyFacility" ("facilityId");