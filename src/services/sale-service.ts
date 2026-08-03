import api from '../lib/api';

export interface SaleItem {
  id?: number;
  saleId?: number;
  productId: number;
  quantity: number;
  quantityType: 'gram' | 'kilogram';
  itemPrice: number;
  itemTotal: number;
  itemProfit: number;
  product?: { id: number; productName: string };
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
  receiptImage: string | null;
  deliveryCharges: number;
  totalAmount: number;
  totalProfit: number;
  items: SaleItem[];
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SalesResponse { sales: Sale[]; total: number; page: number; totalPages: number; }
export interface SaleFilters { page?: number; limit?: number; saleDate?: string; customerName?: string; customerContact?: string; city?: string; }

export const saleService = {
  async getSales(params: SaleFilters): Promise<SalesResponse> { return (await api.get('/sales', { params })).data; },
  async getSaleById(id: number): Promise<Sale> { return (await api.get(`/sales/${id}`)).data; },
  async createSale(data: FormData): Promise<Sale> { return (await api.post('/sales', data)).data; },
  async updateSale(id: number, data: FormData): Promise<Sale> { return (await api.put(`/sales/${id}`, data)).data; },
  async deleteSale(id: number): Promise<void> { await api.delete(`/sales/${id}`); },
};
