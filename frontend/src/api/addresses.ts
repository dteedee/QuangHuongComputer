import { client } from './client';

/**
 * Address book (storefront "sổ địa chỉ") — moved out of `api/ai.ts`, which
 * never had anything to do with addresses (W1-9, step 7a). `api/ai.ts`
 * re-exports these for its existing importers. Signatures kept exactly as
 * they were (verbatim move — no typing changes, to avoid any risk to the
 * unowned call sites in `pages/account/address-book-page.tsx` and
 * `components/address-book-selector.tsx`).
 *
 * NOTE (found while moving this, not fixed here — see
 * `reports/integration-requests-w1.md`): `api/auth.ts`'s
 * `authApi.{addAddress,updateAddress,deleteAddress,getMyAddresses}` is a
 * SECOND, independent address CRUD hitting `/auth/me/addresses` (this file
 * hits `/sales/addresses`). `pages/AccountPage.tsx` uses the `authApi` one;
 * `pages/account/address-book-page.tsx` + `components/address-book-selector.tsx`
 * use this one. Two different backend routes for the same feature — flagged,
 * not merged (needs the backend owner to say which route is canonical).
 */

export async function getAddresses() {
    const { data } = await client.get('/sales/addresses');
    return data;
}

export async function addAddress(address: any) {
    const { data } = await client.post('/sales/addresses', address);
    return data;
}

export async function updateAddress(id: string, address: any) {
    const { data } = await client.put(`/sales/addresses/${id}`, address);
    return data;
}

export async function deleteAddress(id: string) {
    await client.delete(`/sales/addresses/${id}`);
}

export async function setDefaultAddress(id: string) {
    const { data } = await client.post(`/sales/addresses/${id}/set-default`);
    return data;
}
