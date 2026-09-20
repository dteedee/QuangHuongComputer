import { client } from './client';

/**
 * Address book (storefront "sổ địa chỉ") — moved out of `api/ai.ts`, which
 * never had anything to do with addresses (W1-9, step 7a). `api/ai.ts`
 * re-exports these for its existing importers. Signatures kept exactly as
 * they were (verbatim move — no typing changes, to avoid any risk to the
 * unowned call sites in `pages/account/address-book-page.tsx` and
 * `components/address-book-selector.tsx`).
 *
 * NOTE: `api/auth.ts`'s `authApi.{addAddress,updateAddress,deleteAddress,
 * getMyAddresses}` used to be a SECOND, independent address CRUD hitting
 * `/auth/me/addresses`. Backend removed that route cluster at W1-2 (see
 * `backend/Services/Identity/Endpoints/UserProfileEndpoints.cs` header —
 * `/api/sales/addresses`, i.e. this file, is the surviving book) and grep
 * confirmed zero remaining callers of the `authApi` versions, so they were
 * deleted from `api/auth.ts` too. This file (`/sales/addresses`) is the only
 * address book now.
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
