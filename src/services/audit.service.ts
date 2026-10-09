import { api } from './api';
import { AuditLogEntry } from '../types';

export const auditService = {
  getAuditLogs: async (params?: Record<string, any>): Promise<AuditLogEntry[]> => {
    return api.get('/audit/', params);
  },

  logAction: async (action: string, details: string, traderId?: string): Promise<AuditLogEntry> => {
    return api.post('/audit/', { action, details, traderId });
  },
};
