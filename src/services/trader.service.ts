import { api } from './api';
import { Trader, LegalTraderDetails, InformalTraderDetails } from '../types';

export interface PaginatedTradersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Trader[];
}

export const traderService = {
  getTraders: async (params?: Record<string, any>): Promise<Trader[]> => {
    const res = await api.get('/traders/', params);
    return Array.isArray(res) ? res : (res?.results || []);
  },

  getPaginatedTraders: async (params?: Record<string, any>): Promise<PaginatedTradersResponse> => {
    const res = await api.get('/traders/', params);
    if (Array.isArray(res)) {
      return { count: res.length, next: null, previous: null, results: res };
    }
    return {
      count: res?.count ?? (res?.results?.length || 0),
      next: res?.next || null,
      previous: res?.previous || null,
      results: res?.results || [],
    };
  },

  getTraderById: async (traderId: string): Promise<Trader> => {
    return api.get(`/traders/${traderId}/`);
  },

  createLegalTrader: async (details: LegalTraderDetails): Promise<Trader> => {
    return api.post('/traders/legal/', details);
  },

  createInformalTrader: async (details: InformalTraderDetails): Promise<Trader> => {
    return api.post('/traders/informal/', details);
  },

  updateLegalTrader: async (traderId: string, details: Partial<LegalTraderDetails>): Promise<Trader> => {
    return api.post(`/traders/${traderId}/update-legal/`, details);
  },

  updateInformalTrader: async (traderId: string, details: Partial<InformalTraderDetails>): Promise<Trader> => {
    return api.post(`/traders/${traderId}/update-informal/`, details);
  },

  deleteTrader: async (traderId: string): Promise<void> => {
    return api.delete(`/traders/${traderId}/`);
  },

  submitForReview: async (traderId: string): Promise<Trader> => {
    return api.post(`/traders/${traderId}/submit/`);
  },
};
