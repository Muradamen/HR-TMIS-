import { api } from './api';
import { Woreda, Kebele } from '../types';

export const locationService = {
  getWoredas: async (): Promise<Woreda[]> => {
    return api.get('/locations/woredas/');
  },

  getKebeles: async (woredaId?: number): Promise<Kebele[]> => {
    return api.get('/locations/kebeles/', woredaId ? { woreda: woredaId } : undefined);
  },

  createWoreda: async (name: string, code: string): Promise<Woreda> => {
    return api.post('/locations/woredas/', { name, code });
  },

  createKebele: async (woredaId: number, name: string, code: string): Promise<Kebele> => {
    return api.post('/locations/kebeles/', { woreda: woredaId, name, code });
  },
};
