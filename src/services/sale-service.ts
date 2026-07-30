import api from '../lib/api';

export interface SaleItem {
  id?: number;
  productId: number;
  quantity: number;
  quantityType: 'gram' | 'kilogram';
  itemPrice: number;
  itemTotal: number;
  itemProfit: number;
  product?: {
    id: number;
    productName: string;
    profitRule?: {
      profitPerGram: number;
      profitPerKilogram: number;
    };
  };
}

export interface Sale {
  id: number;
  userId: number;
  saleDate: string;
  customerName: string;
  customerContact: string;
  trackingNumber: string;
  courierName: string;
  address: string;
  city: string;
  receiptImage: string;
  deliveryCharges: number;
  totalAmount: number;
  totalProfit: number;
  items: SaleItem[];
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SalesResponse {
  sales: Sale[];
  total: number;
  page: number;
  totalPages: number;
}

export const saleService = {
  async getSales(params: {
    page?: number;
    limit?: number;
    search?: string;
    city?: string;
    productId?: number;
    month?: string;
    year?: string;
  }): Promise<SalesResponse> {
    const response = await api.get('/sales', { params });
    return response.data;
  },

  async getSaleById(id: number): Promise<Sale> {
    const response = await api.get(`/sales/${id}`);
    return response.data;
  },

  async createSale(data: FormData): Promise<Sale> {
    const response = await api.post('/sales', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async updateSale(id: number, data: FormData): Promise<Sale> {
    const response = await api.put(`/sales/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async deleteSale(id: number): Promise<void> {
    await api.delete(`/sales/${id}`);
  },
};