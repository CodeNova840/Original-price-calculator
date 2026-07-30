import api from '../lib/api';

export interface ProfitRule {
  id: number;
  productId: number;
  profitPerGram: number;
  profitPerKilogram: number;
  product?: {
    productName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export const profitService = {
  async getProfitRules(): Promise<ProfitRule[]> {
    const response = await api.get('/profits-rules');
    return response.data;
  },

  async createProfitRule(data: {
    productId: number;
    profitPerGram: number;
    profitPerKilogram: number;
  }): Promise<ProfitRule> {
    const response = await api.post('/profits-rules', data);
    return response.data;
  },

  async updateProfitRule(id: number, data: {
    profitPerGram: number;
    profitPerKilogram: number;
  }): Promise<ProfitRule> {
    const response = await api.put(`/profits-rules/${id}`, data);
    return response.data;
  },

  async deleteProfitRule(id: number): Promise<void> {
    await api.delete(`/profits-rules/${id}`);
  },
};