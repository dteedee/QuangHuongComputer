import { client } from './client';

export interface AiRecommendation {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
    similarityScore: number;
}

export const aiApi = {
    chat: async (message: string): Promise<{ response: string }> => {
        const { data } = await client.post('/ai/chat', { message });
        return data;
    },

    getRecommendations: async (productId: string): Promise<{ recommendations: AiRecommendation[], baseProductId: string }> => {
        const { data } = await client.get(`/ai/recommendations/${productId}`);
        return data;
    },

    naturalLanguageSearch: async (query: string): Promise<{ intelligentResult: string }> => {
        const { data } = await client.post('/ai/search', { message: query });
        return data;
    }
};
