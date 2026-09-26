/**
 * Repair service catalog (`RepairServiceType`) — replaces the hard-coded
 * InShop/OnSite enum. Public list = active services for the booking form;
 * admin CRUD needs `Repair.ViewAll` to read and `Repair.ManageServiceTypes` to write.
 */
import client from '../client';

export interface RepairServiceType {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    /** VAT-inclusive integer VND — pre-fills a quote line. */
    basePrice: number;
    estimatedMinutes: number;
    isOnSite: boolean;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt?: string | null;
}

export type PublicRepairServiceType = Pick<RepairServiceType, 'id' | 'code' | 'name' | 'description' | 'basePrice' | 'estimatedMinutes' | 'isOnSite'>;

export type RepairServiceTypeWriteDto = Pick<
    RepairServiceType,
    'code' | 'name' | 'description' | 'basePrice' | 'estimatedMinutes' | 'isOnSite' | 'sortOrder' | 'isActive'
>;

export const repairServiceTypesApi = {
    listActive: async (): Promise<PublicRepairServiceType[]> => (await client.get('/repair/service-types')).data,
    listAll: async (): Promise<RepairServiceType[]> => (await client.get('/repair/admin/service-types')).data,
    create: async (dto: RepairServiceTypeWriteDto): Promise<RepairServiceType> =>
        (await client.post('/repair/admin/service-types', dto)).data,
    update: async (id: string, dto: RepairServiceTypeWriteDto): Promise<RepairServiceType> =>
        (await client.put(`/repair/admin/service-types/${id}`, dto)).data,
    remove: async (id: string): Promise<void> => {
        await client.delete(`/repair/admin/service-types/${id}`);
    },
};
