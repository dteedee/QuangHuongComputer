/**
 * Global search providers (phase spec step 7): orders by number/phone,
 * products by name/SKU, customers, serials. `AdminGlobalSearch.tsx` belongs
 * to the frozen shell (W1-8) and today only fuzzy-matches a static menu
 * list — it has no async-provider slot yet. This module is the data side
 * of that; the one-line hook-up (wiring these into the search box's result
 * list) is requested from W3-G, see `reports/integration-requests-w3.md`.
 */
import { Receipt, Package, User, Barcode } from 'lucide-react';
import { createElement } from 'react';
import { salesAdminOrdersApi } from '../../../api/sales/admin-orders';
import { catalogApi } from '../../../api/catalog';
import { crmApi } from '../../../api/crm';
import { inventoryApi } from '../../../api/inventory';
import type { SearchItem } from '../../../components/backoffice/AdminGlobalSearch';

const MAX_RESULTS_PER_PROVIDER = 5;

export async function searchOrders(query: string): Promise<SearchItem[]> {
    if (query.trim().length < 2) return [];
    const { orders } = await salesAdminOrdersApi.admin.getOrders(1, MAX_RESULTS_PER_PROVIDER, query);
    return orders.map((o) => ({
        title: `#${o.orderNumber}`,
        description: `${o.customerName || 'Khách vãng lai'} · ${o.customerPhone || ''}`,
        path: `/backoffice/orders?orderId=${o.id}`,
        group: 'Đơn hàng',
        icon: createElement(Receipt, { size: 18 }),
    }));
}

export async function searchProducts(query: string): Promise<SearchItem[]> {
    if (query.trim().length < 2) return [];
    const data = await catalogApi.searchProducts({ query, page: 1, pageSize: MAX_RESULTS_PER_PROVIDER });
    return data.products.map((p) => ({
        title: p.name,
        description: p.sku ? `SKU ${p.sku}` : undefined,
        path: `/backoffice/products/${p.id}`,
        group: 'Sản phẩm',
        icon: createElement(Package, { size: 18 }),
    }));
}

export async function searchCustomers(query: string): Promise<SearchItem[]> {
    if (query.trim().length < 2) return [];
    const data = await crmApi.customers.getList({ search: query, pageSize: MAX_RESULTS_PER_PROVIDER });
    return data.items.map((c: any) => ({
        title: c.fullName || c.name || c.email,
        description: c.phone || c.email,
        path: `/backoffice/crm/customers/${c.id}`,
        group: 'Khách hàng',
        icon: createElement(User, { size: 18 }),
    }));
}

export async function searchSerials(query: string): Promise<SearchItem[]> {
    if (query.trim().length < 3) return [];
    try {
        const serial = await inventoryApi.serials.lookup(query);
        if (!serial) return [];
        return [{
            title: serial.serial,
            description: serial.productName,
            path: `/backoffice/inventory/serials?serial=${encodeURIComponent(serial.serial)}`,
            group: 'Serial',
            icon: createElement(Barcode, { size: 18 }),
        }];
    } catch {
        return []; // không tìm thấy — im lặng, không phải lỗi hiển thị
    }
}

/** Chạy song song cả bốn nguồn, gộp kết quả — dùng khi W3-G nối vào ô search. */
export async function runGlobalSearchProviders(query: string): Promise<SearchItem[]> {
    const results = await Promise.allSettled([searchOrders(query), searchProducts(query), searchCustomers(query), searchSerials(query)]);
    return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}
