import { api } from './api';
import { AuditLogEntry } from '../types';

export const auditService = {
  getAuditLogs: async (params?: Record<string, any>): Promise<AuditLogEntry[]> => {
    const res = await api.get('/audit/', params);
    return Array.isArray(res) ? res : (res?.results || []);
  },

  logAction: async (action: string, details: string, traderId?: string): Promise<AuditLogEntry> => {
    return api.post('/audit/', { action, details, traderId });
  },
};
