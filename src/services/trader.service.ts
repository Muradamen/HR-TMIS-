import { api } from './api';
import { Trader, LegalTraderDetails, InformalTraderDetails } from '../types';

export const traderService = {
  getTraders: async (params?: Record<string, any>): Promise<Trader[]> => {
    const res = await api.get('/traders/', params);
    return Array.isArray(res) ? res : (res?.results || []);
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
