import { api, ApiError } from './api';

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

function getActiveLanguage(): string {
  try {
    return localStorage.getItem('hr_tmis_language_v1') || 'en';
  } catch {
    return 'en';
  }
}

function getCsrfToken(): string | null {
  const name = 'csrftoken';
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith(name + '='))
    ?.split('=')[1];
  return cookieValue || null;
}

export function triggerBlobDownload(blob: Blob, fallbackFilename: string, contentDisposition?: string | null) {
  let filename = fallbackFilename;
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1];
    }
  }

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

async function handleBlobResponse(res: Response, fallbackFilename: string): Promise<Blob> {
  if (!res.ok) {
    let errorData: any = null;
    try {
      errorData = await res.json();
    } catch {
      errorData = { detail: res.statusText };
    }
    const err: ApiError = {
      message: errorData?.detail || errorData?.message || `Export failed with status ${res.status}`,
      code: errorData?.code,
      details: errorData,
    };
    throw err;
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition');
  triggerBlobDownload(blob, fallbackFilename, disposition);
  return blob;
}

export const reportsService = {
  getDashboardMetrics: async (): Promise<DashboardMetrics> => {
    return api.get('/reports/dashboard/');
  },

  // Export Selected to Excel
  exportSelectedExcel: async (ids: string[], lang = getActiveLanguage()): Promise<Blob> => {
    const csrf = getCsrfToken();
    const res = await fetch('/api/v1/reports/export/excel/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': lang,
        ...(csrf ? { 'X-CSRFToken': csrf } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ ids, lang, scope: 'selected' }),
    });
    return handleBlobResponse(res, `HT-TMIS_Selected_Traders_${lang}.xlsx`);
  },

  // Export Selected to PDF
  exportSelectedPdf: async (ids: string[], lang = getActiveLanguage()): Promise<Blob> => {
    const csrf = getCsrfToken();
    const res = await fetch('/api/v1/reports/export/pdf/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': lang,
        ...(csrf ? { 'X-CSRFToken': csrf } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ ids, lang, scope: 'selected' }),
    });
    return handleBlobResponse(res, `HT-TMIS_Selected_Traders_${lang}.pdf`);
  },

  // Export All Filtered to Excel
  exportFilteredExcel: async (filters: Record<string, any>, lang = getActiveLanguage()): Promise<Blob> => {
    const csrf = getCsrfToken();
    const res = await fetch('/api/v1/reports/export/excel/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': lang,
        ...(csrf ? { 'X-CSRFToken': csrf } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ ...filters, lang, scope: 'filtered' }),
    });
    return handleBlobResponse(res, `HT-TMIS_Filtered_Traders_${lang}.xlsx`);
  },

  // Export All Filtered to PDF
  exportFilteredPdf: async (filters: Record<string, any>, lang = getActiveLanguage()): Promise<Blob> => {
    const csrf = getCsrfToken();
    const res = await fetch('/api/v1/reports/export/pdf/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': lang,
        ...(csrf ? { 'X-CSRFToken': csrf } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ ...filters, lang, scope: 'filtered' }),
    });
    return handleBlobResponse(res, `HT-TMIS_Filtered_Traders_${lang}.pdf`);
  },

  // Export to CSV
  downloadCsv: async (params?: Record<string, any>, lang = getActiveLanguage()): Promise<Blob> => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`/api/v1/reports/export/csv/${qs}`, {
      credentials: 'include',
      headers: {
        'Accept-Language': lang,
      },
    });
    return handleBlobResponse(res, `HT-TMIS_Registry_${lang}.csv`);
  },

  downloadExcel: async (params?: Record<string, any>, lang = getActiveLanguage()): Promise<Blob> => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`/api/v1/reports/export/excel/${qs}`, {
      credentials: 'include',
      headers: {
        'Accept-Language': lang,
      },
    });
    return handleBlobResponse(res, `HT-TMIS_Registry_${lang}.xlsx`);
  },

  downloadPdf: async (traderId: string, lang = getActiveLanguage()): Promise<Blob> => {
    const res = await fetch(`/api/v1/reports/certificate/${traderId}/pdf/?lang=${lang}`, {
      credentials: 'include',
      headers: {
        'Accept-Language': lang,
      },
    });
    return handleBlobResponse(res, `Certificate_${traderId}_${lang}.pdf`);
  },
};
