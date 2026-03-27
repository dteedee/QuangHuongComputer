import { client } from './client';

/**
 * PC Builder API
 * Frontend module for the Advanced PC Configurator
 * Phase 3.1
 */

// ============================================
// TYPES
// ============================================

export interface PcComponentData {
    productId: string;
    type: string;
    quantity: number;
    specs?: Record<string, string>;
}

export interface PcCompatibilityResult {
    isCompatible: boolean;
    estimatedWattage: number;
    issues: string[];
}

export interface PcBuildItemRequest {
    productId: string;
    quantity: number;
    componentType?: string;
}

export interface CheckPcCompatibilityRequest {
    items: PcBuildItemRequest[];
}

export interface SavePcBuildRequest {
    name: string;
    items: PcBuildItemRequest[];
}

export interface SavedPcBuildItem {
    id: string;
    productId: string;
    componentType: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    product?: {
        name: string;
        imageUrl?: string;
        sku: string;
        specs: Record<string, string>;
    };
}

export interface SavedPcBuild {
    id: string;
    buildCode: string;
    name: string;
    totalPrice: number;
    totalWattage: number;
    isCompatible: boolean;
    issues: string[];
    items: SavedPcBuildItem[];
    createdAt?: string;
    itemCount?: number;
}

// ============================================
// API
// ============================================

export const pcBuilderApi = {
    /** 
     * Evaluate compatibility of a list of components 
     */
    checkCompatibility: async (data: CheckPcCompatibilityRequest): Promise<PcCompatibilityResult> => {
        const response = await client.post<PcCompatibilityResult>('/catalog/pc-builder/check-compatibility', data);
        return response.data;
    },

    /** 
     * Save a completed PC Build configuration 
     */
    saveBuild: async (data: SavePcBuildRequest): Promise<SavedPcBuild> => {
        const response = await client.post<SavedPcBuild>('/catalog/pc-builder/builds', data);
        return response.data;
    },

    /** 
     * Retrieve a detailed PC Build by its 8-character shareable code 
     */
    getBuildByCode: async (code: string): Promise<SavedPcBuild> => {
        const response = await client.get<SavedPcBuild>(`/catalog/pc-builder/builds/${code}`);
        return response.data;
    },

    /** 
     * Retrieve all saved builds for the currently authenticated user 
     */
    getMyBuilds: async (): Promise<SavedPcBuild[]> => {
        const response = await client.get<SavedPcBuild[]>('/catalog/pc-builder/builds/my');
        return response.data;
    }
};

// ============================================
// HELPERS
// ============================================

export const COMPONENT_TYPES = [
    { id: 'CPU', name: 'Vi xử lý (CPU)' },
    { id: 'Motherboard', name: 'Bo mạch chủ (Mainboard)' },
    { id: 'RAM', name: 'Bộ nhớ trong (RAM)' },
    { id: 'GPU', name: 'Card màn hình (VGA)' },
    { id: 'Storage', name: 'Ổ cứng (SSD/HDD)' },
    { id: 'PSU', name: 'Nguồn (PSU)' },
    { id: 'Case', name: 'Vỏ máy tính (Case)' },
    { id: 'Cooler', name: 'Tản nhiệt (Cooler)' }
];
