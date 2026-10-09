import { api } from './api';
import { Trader, TraderStatus } from '../types';

export const verificationService = {
  getVerificationQueue: async (params?: Record<string, any>): Promise<Trader[]> => {
    const res = await api.get('/verification/queue/', params);
    return Array.isArray(res) ? res : (res?.results || []);
  },

  claimTrader: async (traderId: string): Promise<Trader> => {
    return api.post(`/verification/${traderId}/claim/`);
  },

  verifyTrader: async (
    traderId: string,
    status: TraderStatus,
    notes: string
  ): Promise<Trader> => {
    return api.post(`/verification/${traderId}/decision/`, {
      status,
      notes,
    });
  },
};
