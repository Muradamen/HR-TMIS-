/**
 * HT-TMIS Centralized API Client
 * Connects React frontend with Django REST Framework backend
 */

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, string[] | string>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

function getCsrfToken(): string | null {
  const name = 'csrftoken';
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith(name + '='))
    ?.split('=')[1];
  return cookieValue || null;
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const csrfToken = getCsrfToken();
  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(options.method || 'GET')) {
    headers['X-CSRFToken'] = csrfToken;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Include session cookie for DRF SessionAuthentication
  });

  if (!response.ok) {
    let errorData: any = null;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }

    const error: ApiError = {
      message:
        errorData?.detail ||
        errorData?.message ||
        `API request failed with status ${response.status}`,
      details: typeof errorData === 'object' ? errorData : undefined,
    };
    throw error;
  }

  // If 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  get: <T = any>(endpoint: string, params?: Record<string, any>) => {
    let url = endpoint;
    if (params) {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          search.append(k, String(v));
        }
      });
      const qs = search.toString();
      if (qs) url += `?${qs}`;
    }
    return request<T>(url, { method: 'GET' });
  },

  post: <T = any>(endpoint: string, body?: any) => {
    return request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put: <T = any>(endpoint: string, body?: any) => {
    return request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch: <T = any>(endpoint: string, body?: any) => {
    return request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete: <T = any>(endpoint: string) => {
    return request<T>(endpoint, { method: 'DELETE' });
  },
};
