import { api } from './api';

export interface DashboardMetrics {
  totalTraders: number;
  legalCount: number;
  informalCount: number;
  pendingCount: number;
  approvedCount: number;
  returnedCount: number;
  totalInformalCapital: number;
  readyForTinCount: number;
  woredaDistribution: Record<string, number>;
  sectorDistribution: Record<string, number>;
}

export const reportsService = {
  getDashboardMetrics: async (): Promise<DashboardMetrics> => {
    return api.get('/reports/dashboard/');
  },

  downloadExcel: async (params?: Record<string, any>): Promise<Blob> => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`/api/v1/reports/export/excel/${qs}`, {
      credentials: 'include',
    });
    return res.blob();
  },

  downloadCsv: async (params?: Record<string, any>): Promise<Blob> => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`/api/v1/reports/export/csv/${qs}`, {
      credentials: 'include',
    });
    return res.blob();
  },

  downloadPdf: async (traderId: string, lang = 'en'): Promise<Blob> => {
    const res = await fetch(`/api/v1/reports/certificate/${traderId}/pdf/?lang=${lang}`, {
      credentials: 'include',
    });
    return res.blob();
  },
};
