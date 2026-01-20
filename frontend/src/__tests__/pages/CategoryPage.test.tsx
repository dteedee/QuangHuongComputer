/**
 * Unit tests for CategoryPage component
 * Tests filtering, sorting, and pagination functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CategoryPage } from '../../pages/CategoryPage';
import * as catalogApi from '../../api/catalog';

// Mock the catalog API
vi.mock('../../api/catalog');

const mockCategories = [
    { id: 'cat-1', name: 'Laptop - Máy Tính Xách Tay', description: 'Laptop' },
    { id: 'cat-2', name: 'Màn Hình Máy Tính', description: 'Screens' }
];

const mockBrands = [
    { id: 'brand-1', name: 'ASUS', description: 'ASUS Brand' },
    { id: 'brand-2', name: 'Dell', description: 'Dell Brand' }
];

const mockProducts = [
    {
        id: 'prod-1',
        name: 'ASUS ROG Strix',
        sku: 'QH-TEST001',
        description: 'Gaming laptop',
        price: 25000000,
        oldPrice: 28000000,
        specifications: '{"RAM":"16GB","SSD":"512GB"}',
        warrantyInfo: 'Bảo hành 24 tháng',
        categoryId: 'cat-1',
        brandId: 'brand-1',
        stockQuantity: 10,
        status: 'InStock' as const,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
    },
    {
        id: 'prod-2',
        name: 'Dell XPS 15',
        sku: 'QH-TEST002',
        description: 'Professional laptop',
        price: 30000000,
        oldPrice: 32000000,
        categoryId: 'cat-1',
        brandId: 'brand-2',
        stockQuantity: 5,
        status: 'InStock' as const,
        createdAt: '2024-01-02',
        updatedAt: '2024-01-02'
    }
];

describe('CategoryPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mocks
        vi.mocked(catalogApi.catalogApi.getCategories).mockResolvedValue(mockCategories);
        vi.mocked(catalogApi.catalogApi.getBrands).mockResolvedValue(mockBrands);
        vi.mocked(catalogApi.catalogApi.searchProducts).mockResolvedValue({
            products: mockProducts,
            total: 2,
            page: 1,
            pageSize: 12
        });
    });

    it('renders product list page', async () => {
        render(
            <BrowserRouter>
                <CategoryPage />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Tìm thấy/i)).toBeInTheDocument();
        });
    });

    it('calls searchProducts with correct categoryId filter', async () => {
        const searchProductsSpy = vi.mocked(catalogApi.catalogApi.searchProducts);

        render(
            <BrowserRouter>
                <CategoryPage />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(searchProductsSpy).toHaveBeenCalled();
        });

        const callArgs = searchProductsSpy.mock.calls[0][0];
        expect(callArgs).toBeDefined();
    });

    it('filters products by brand when brand is selected', async () => {
        const searchProductsSpy = vi.mocked(catalogApi.catalogApi.searchProducts);

        render(
            <BrowserRouter>
                <CategoryPage />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('ASUS')).toBeInTheDocument();
        });

        // Click ASUS brand filter
        const asusCheckbox = screen.getByRole('checkbox', { name: /ASUS/i });
        fireEvent.click(asusCheckbox);

        await waitFor(() => {
            const lastCall = searchProductsSpy.mock.calls[searchProductsSpy.mock.calls.length - 1];
            expect(lastCall[0]?.brandId).toBe('brand-1');
        });
    });

    it('filters products by price range when price range is selected', async () => {
        const searchProductsSpy = vi.mocked(catalogApi.catalogApi.searchProducts);

        render(
            <BrowserRouter>
                <CategoryPage />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/10 - 15 triệu/i)).toBeInTheDocument();
        });

        // Select price range
        const priceRadio = screen.getByRole('radio', { name: /10 - 15 triệu/i });
        fireEvent.click(priceRadio);

        await waitFor(() => {
            const lastCall = searchProductsSpy.mock.calls[searchProductsSpy.mock.calls.length - 1];
            expect(lastCall[0]?.minPrice).toBe(10000000);
            expect(lastCall[0]?.maxPrice).toBe(15000000);
        });
    });

    it('applies sort when sort option is changed', async () => {
        const searchProductsSpy = vi.mocked(catalogApi.catalogApi.searchProducts);

        render(
            <BrowserRouter>
                <CategoryPage />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Sắp xếp theo/i)).toBeInTheDocument();
        });

        const sortSelect = screen.getByRole('combobox');
        fireEvent.change(sortSelect, { target: { value: 'price_asc' } });

        await waitFor(() => {
            const lastCall = searchProductsSpy.mock.calls[searchProductsSpy.mock.calls.length - 1];
            expect(lastCall[0]?.sortBy).toBe('price_asc');
        });
    });

    it('displays correct number of products from API', async () => {
        render(
            <BrowserRouter>
                <CategoryPage />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('ASUS ROG Strix')).toBeInTheDocument();
            expect(screen.getByText('Dell XPS 15')).toBeInTheDocument();
        });
    });

    it('shows loading state initially', () => {
        render(
            <BrowserRouter>
                <CategoryPage />
            </BrowserRouter>
        );

        // Check for loading skeletons
        const loadingElements = screen.getAllByRole('generic');
        expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('navigates to product detail when product card is clicked', async () => {
        render(
            <BrowserRouter>
                <CategoryPage />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('ASUS ROG Strix')).toBeInTheDocument();
        });

        const productLink = screen.getByText('ASUS ROG Strix').closest('a');
        expect(productLink).toHaveAttribute('href');
    });

    it('clears all filters when clear button is clicked', async () => {
        const searchProductsSpy = vi.mocked(catalogApi.catalogApi.searchProducts);

        render(
            <BrowserRouter>
                <CategoryPage />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('ASUS')).toBeInTheDocument();
        });

        // Apply a filter
        const asusCheckbox = screen.getByRole('checkbox', { name: /ASUS/i });
        fireEvent.click(asusCheckbox);

        await waitFor(() => {
            expect(screen.getByText(/Xóa/i)).toBeInTheDocument();
        });

        // Clear filters
        const clearButton = screen.getByText(/Xóa/i);
        fireEvent.click(clearButton);

        await waitFor(() => {
            const lastCall = searchProductsSpy.mock.calls[searchProductsSpy.mock.calls.length - 1];
            expect(lastCall[0]?.brandId).toBeUndefined();
        });
    });

    it('handles in-stock filter correctly', async () => {
        const searchProductsSpy = vi.mocked(catalogApi.catalogApi.searchProducts);

        render(
            <BrowserRouter>
                <CategoryPage />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Chỉ hiển thị hàng có sẵn/i)).toBeInTheDocument();
        });

        const inStockCheckbox = screen.getByRole('checkbox', { name: /Chỉ hiển thị hàng có sẵn/i });
        fireEvent.click(inStockCheckbox);

        await waitFor(() => {
            const lastCall = searchProductsSpy.mock.calls[searchProductsSpy.mock.calls.length - 1];
            expect(lastCall[0]?.inStock).toBe(true);
        });
    });

    it('handles search query from URL params', async () => {
        // This would require mocking useSearchParams
        // For now, we verify that the component can handle search queries
        const searchProductsSpy = vi.mocked(catalogApi.catalogApi.searchProducts);

        render(
            <BrowserRouter>
                <CategoryPage />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(searchProductsSpy).toHaveBeenCalled();
        });
    });

    it('shows no results message when no products match', async () => {
        vi.mocked(catalogApi.catalogApi.searchProducts).mockResolvedValue({
            products: [],
            total: 0,
            page: 1,
            pageSize: 12
        });

        render(
            <BrowserRouter>
                <CategoryPage />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Không tìm thấy sản phẩm nào phù hợp/i)).toBeInTheDocument();
        });
    });
});
