import client from './client';

export interface ConfigEntry {
    key: string;
    value: string;
    description: string;
    lastUpdated: string;
}

export const systemConfigApi = {
    getConfigs: async () => {
        const response = await client.get<ConfigEntry[]>('/config');
        return response.data;
    },
    updateConfig: async (key: string, value: string) => {
        const response = await client.post(`/config/${key}`, { value });
        return response.data;
    }
};
