# Catalog & Product Detail Implementation

## Overview
This document describes the implementation of the Catalog and Product Detail features for the QuangHuongComputer e-commerce platform.

## Features Implemented

### 4.1 Product Listing Page (`/products`)

#### Backend Enhancements
**File: `backend/Services/Catalog/CatalogEndpoints.cs`**

Added advanced filtering and sorting capabilities:
- **Sorting Options:**
  - `price_asc` - Price ascending
  - `price_desc` - Price descending
  - `newest` - Newest first (default)
  - `name` - Alphabetical order

- **Filter Parameters:**
  - `categoryId` - Filter by category
  - `brandId` - Filter by brand
  - `minPrice` / `maxPrice` - Price range
  - `inStock` - Show only available products
  - `query` - Text search in name/description

**File: `backend/Services/Catalog/Domain/Product.cs`**

Enhanced Product model with:
- `Sku` - Product SKU (auto-generated: QH-XXXXXXXX)
- `OldPrice` - Original price for discount calculation
- `Specifications` - JSON string for product specs (RAM, SSD, etc.)
- `WarrantyInfo` - Warranty information
- `Status` - Product status enum (InStock, LowStock, OutOfStock, PreOrder)

#### Frontend Implementation
**File: `frontend/src/pages/CategoryPage.tsx`**

- Sidebar filters for:
  - Category selection
  - Brand filtering (checkbox)
  - Price range selection (radio buttons)
  - Stock status filter
- Top bar with sorting dropdown
- Product grid display
- Pagination support
- Clear filters functionality

**File: `frontend/src/App.tsx`**
- Added `/products` route
- Added `/products/:id` route for product details

#### API Integration
**File: `frontend/src/api/catalog.ts`**

Updated Product interface with new fields:
```typescript
interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  oldPrice?: number;
  specifications?: string;
  warrantyInfo?: string;
  status: 'InStock' | 'LowStock' | 'OutOfStock' | 'PreOrder';
  // ... other fields
}
```

Added `sortBy` parameter to `searchProducts` API call.

### 4.2 Product Detail Page (`/products/:id`)

**File: `frontend/src/pages/ProductDetailsPage.tsx`**

Enhanced features:
- Display product SKU
- Show old price and discount percentage
- Display product status badge (In Stock / Low Stock / Out of Stock)
- Warranty information display
- Links to policy pages:
  - `/policy/warranty` - Warranty policy
  - `/policy/return` - Return policy
  - `/policy/shipping` - Shipping policy
- Image gallery
- Tabbed interface:
  - Product description
  - Technical specifications
  - Reviews (placeholder)
- Quantity selector
- "Add to Cart" button
- "Buy Now" button
- Related products section

## Unit Tests

### Backend Tests
**File: `backend/Services/Catalog.Tests/Endpoints/CatalogEndpointsTests.cs`**

Comprehensive unit tests covering:
- ✅ Category filtering
- ✅ Brand filtering
- ✅ Price range filtering
- ✅ Text search
- ✅ Stock availability filtering
- ✅ Sorting (price_asc, price_desc, name)
- ✅ Pagination
- ✅ Combined filters
- ✅ Product retrieval by ID
- ✅ Product status determination
- ✅ Default field values (SKU, warranty)

**Framework:** xUnit with FluentAssertions and InMemory database

### Frontend Tests

#### CategoryPage Tests
**File: `frontend/src/__tests__/pages/CategoryPage.test.tsx`**

Tests covering:
- ✅ Product list rendering
- ✅ Brand filter application
- ✅ Price range filter application
- ✅ Sort option changes
- ✅ Product display
- ✅ Loading states
- ✅ Product navigation
- ✅ Clear filters functionality
- ✅ In-stock filter
- ✅ Search query handling
- ✅ Empty results handling

#### ProductDetailsPage Tests
**File: `frontend/src/__tests__/pages/ProductDetailsPage.test.tsx`**

Tests covering:
- ✅ Product details display
- ✅ SKU display
- ✅ Status badges (InStock, LowStock, OutOfStock)
- ✅ Price and discount calculation
- ✅ Warranty information display
- ✅ Policy page links
- ✅ Add to cart functionality
- ✅ Quantity adjustment
- ✅ Error handling (404, network errors)
- ✅ Loading states
- ✅ Tab navigation
- ✅ Breadcrumb navigation
- ✅ Related products section

**Framework:** Vitest with React Testing Library

## Testing Setup

### Frontend Test Configuration

**File: `frontend/vitest.config.ts`**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
  },
});
```

**File: `frontend/src/__tests__/setup.ts`**
- Configures jest-dom matchers
- Sets up cleanup after each test
- Mocks window.matchMedia
- Mocks IntersectionObserver

### Required Test Dependencies

Add to `frontend/package.json`:
```json
{
  "devDependencies": {
    "vitest": "^1.2.0",
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/user-event": "^14.5.1",
    "jsdom": "^23.0.1"
  },
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

## Running Tests

### Backend Tests
```bash
cd backend/Services/Catalog.Tests
dotnet test
```

### Frontend Tests
```bash
cd frontend

# Install test dependencies first
npm install vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom --save-dev

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## API Endpoints

### Search Products
```
GET /api/catalog/products/search
```

**Query Parameters:**
- `query` (string) - Text search
- `categoryId` (guid) - Filter by category
- `brandId` (guid) - Filter by brand
- `minPrice` (decimal) - Minimum price
- `maxPrice` (decimal) - Maximum price
- `inStock` (boolean) - Only in-stock items
- `sortBy` (string) - Sort order: `price_asc`, `price_desc`, `newest`, `name`
- `page` (int) - Page number (default: 1)
- `pageSize` (int) - Items per page (default: 20)

**Response:**
```json
{
  "total": 100,
  "page": 1,
  "pageSize": 20,
  "products": [...]
}
```

### Get Product by ID
```
GET /api/catalog/products/{id}
```

**Response:**
```json
{
  "id": "...",
  "name": "ASUS ROG Strix",
  "sku": "QH-ABCD1234",
  "price": 25000000,
  "oldPrice": 28000000,
  "specifications": "{\"RAM\":\"16GB\",\"SSD\":\"512GB\"}",
  "warrantyInfo": "Bảo hành 24 tháng",
  "status": "InStock",
  ...
}
```

## Database Migration

After updating the Product model, create and apply a migration:

```bash
cd backend/Services/Catalog
dotnet ef migrations add AddProductEnhancements --context CatalogDbContext
dotnet ef database update --context CatalogDbContext
```

## Key Files Modified/Created

### Backend
- ✅ `backend/Services/Catalog/Domain/Product.cs` - Enhanced product model
- ✅ `backend/Services/Catalog/CatalogEndpoints.cs` - Added sorting support
- ✅ `backend/Services/Catalog.Tests/Catalog.Tests.csproj` - Test project
- ✅ `backend/Services/Catalog.Tests/Endpoints/CatalogEndpointsTests.cs` - Unit tests

### Frontend
- ✅ `frontend/src/App.tsx` - Added /products route
- ✅ `frontend/src/api/catalog.ts` - Updated Product interface
- ✅ `frontend/src/pages/CategoryPage.tsx` - Enhanced with sorting
- ✅ `frontend/src/pages/ProductDetailsPage.tsx` - Enhanced with new fields
- ✅ `frontend/vitest.config.ts` - Test configuration
- ✅ `frontend/src/__tests__/setup.ts` - Test setup
- ✅ `frontend/src/__tests__/pages/CategoryPage.test.tsx` - CategoryPage tests
- ✅ `frontend/src/__tests__/pages/ProductDetailsPage.test.tsx` - ProductDetailsPage tests

## Next Steps

1. **Install frontend test dependencies:**
   ```bash
   cd frontend
   npm install vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom --save-dev
   ```

2. **Run backend database migration:**
   ```bash
   cd backend/Services/Catalog
   dotnet ef migrations add AddProductEnhancements
   dotnet ef database update
   ```

3. **Run backend tests:**
   ```bash
   cd backend/Services/Catalog.Tests
   dotnet test
   ```

4. **Run frontend tests:**
   ```bash
   cd frontend
   npm test
   ```

## Test Coverage

### Backend
- Product query filtering (category, brand, price, search, stock)
- Sorting functionality (price ascending/descending, newest, name)
- Pagination
- Combined filter scenarios
- Product status determination
- Default value generation (SKU, warranty)

### Frontend
- Component rendering
- User interactions (filters, sorting, pagination)
- API integration
- Error handling
- Navigation
- Cart operations
- Loading states

## Notes

- All tests use in-memory databases/mocks to avoid external dependencies
- Tests are isolated and can run in parallel
- Frontend tests mock API calls for predictable behavior
- Backend tests use EF Core InMemory provider
- Product SKU auto-generates in format: QH-XXXXXXXX
- Product status auto-determines based on stock quantity:
  - > 10: InStock
  - 1-10: LowStock
  - 0: OutOfStock
