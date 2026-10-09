import { api } from './api';
import { User } from '../types';

export const authService = {
  login: async (username: string, password: string): Promise<{ user: User }> => {
    // Bootstrap the CSRF cookie before the CSRF-protected session login POST.
    await api.get('/auth/csrf/');
    return api.post('/auth/login/', { username, password });
  },

  logout: async (): Promise<void> => {
    return api.post('/auth/logout/');
  },

  getMe: async (): Promise<User> => {
    return api.get('/auth/me/');
  },
};
