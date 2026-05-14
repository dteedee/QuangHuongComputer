import { client } from './client';

export interface AiRecommendation {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  similarityScore: number;
  slug?: string;
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

// Real recommendations
export async function getRecommendations(productId: string) {
  const { data } = await client.get(`/ai/recommendations/${productId}`);
  return data;
}

export async function getTrendingProducts() {
  const { data } = await client.get('/ai/recommendations/trending');
  return data;
}

// Semantic search
export async function semanticSearch(query: string) {
  const { data } = await client.post('/ai/search', { query });
  return data;
}

// RAG chat
export async function chatWithAI(message: string, history: Array<{ role: string; content: string }> = []) {
  const { data } = await client.post('/ai/chat', { message, history });
  return data;
}

// AI PC Builder
export async function getAIPCBuildSuggestion(budget: number, useCase: string) {
  const { data } = await client.post('/catalog/pc-builder/ai-suggest', { budget, useCase });
  return data;
}

// Address book
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
