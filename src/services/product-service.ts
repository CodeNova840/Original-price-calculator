import api from '../lib/api';

export interface Product {
  id: number;
  productName: string;
  profitRule?: {
    id: number;
    productId: number;
    profitPerGram: number;
    profitPerKilogram: number;
  };
  createdAt: string;
  updatedAt: string;
}

export const productService = {
  async getProducts(): Promise<Product[]> {
    const response = await api.get('/products');
    return response.data;
  },

  async createProduct(productName: string): Promise<Product> {
    const response = await api.post('/products', { productName });
    return response.data;
  },

  async updateProduct(id: number, productName: string): Promise<Product> {
    const response = await api.put(`/products/${id}`, { productName });
    return response.data;
  },

  async deleteProduct(id: number): Promise<void> {
    await api.delete(`/products/${id}`);
  },
};