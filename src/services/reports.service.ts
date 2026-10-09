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
    const res = await fetch(`/api/v1/reports/exports/excel/${qs}`, {
      credentials: 'include',
    });
    return res.blob();
  },

  downloadPdf: async (traderId: string): Promise<Blob> => {
    const res = await fetch(`/api/v1/reports/exports/pdf/${traderId}/`, {
      credentials: 'include',
    });
    return res.blob();
  },
};
