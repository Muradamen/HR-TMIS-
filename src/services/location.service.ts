import { api } from './api';
import { Woreda, Kebele } from '../types';

export const locationService = {
  getWoredas: async (): Promise<Woreda[]> => {
    const res = await api.get('/locations/woredas/');
    return Array.isArray(res) ? res : (res?.results || []);
  },

  getKebeles: async (woredaId?: number): Promise<Kebele[]> => {
    const res = await api.get('/locations/kebeles/', woredaId ? { woreda: woredaId } : undefined);
    return Array.isArray(res) ? res : (res?.results || []);
  },

  createWoreda: async (name: string, code: string): Promise<Woreda> => {
    return api.post('/locations/woredas/', { name, code });
  },

  createKebele: async (woredaId: number, name: string, code: string): Promise<Kebele> => {
    return api.post('/locations/kebeles/', { woreda: woredaId, name, code });
  },
};
