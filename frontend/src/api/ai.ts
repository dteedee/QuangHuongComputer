import { client } from './client';

/**
 * Address book functions moved to `api/addresses.ts` (W1-9, step 7a) — this
 * file is AI (recommendations/search/chat/PC-builder), addresses never
 * belonged here. Re-exported for `pages/account/address-book-page.tsx` and
 * `components/address-book-selector.tsx`, which keep importing from here
 * unchanged; new code should import `api/addresses.ts` directly.
 */
export { getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress } from './addresses';

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
