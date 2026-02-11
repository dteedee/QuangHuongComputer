-- Add IsActive column to Categories table
ALTER TABLE Categories
ADD COLUMN IsActive BIT NOT NULL DEFAULT 1;

-- Add IsActive column to Brands table
ALTER TABLE Brands
ADD COLUMN IsActive BIT NOT NULL DEFAULT 1;

-- Add constraint for check (1 = Active, 0 = Inactive)
ALTER TABLE Categories
ADD CONSTRAINT CK_Categories_IsActive CHECK (IsActive IN (0, 1));

ALTER TABLE Brands
ADD CONSTRAINT CK_Brands_IsActive CHECK (IsActive IN (0, 1));

-- Update existing records to be active by default
UPDATE Categories SET IsActive = 1 WHERE IsActive IS NULL;
UPDATE Brands SET IsActive = 1 WHERE IsActive IS NULL;
