import axios from 'axios';

// The local API Gateway runs on port 5000 usually, but for React Native (Android Emulator) 
// localhost is 10.0.2.2.
const API_URL = 'http://10.0.2.2:5000/api';

export const client = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const catalogApi = {
    getProducts: async () => {
        const { data } = await client.get('/catalog/products');
        return data; // returns { products: [], total: 0 }
    },
    getCategories: async () => {
        const { data } = await client.get('/catalog/categories');
        return data;
    }
};
