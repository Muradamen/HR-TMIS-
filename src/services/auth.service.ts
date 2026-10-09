import { api } from './api';
import { User } from '../types';

export const authService = {
  login: async (username: string, password: string): Promise<{ user: User }> => {
    return api.post('/auth/login/', { username, password });
  },

  logout: async (): Promise<void> => {
    return api.post('/auth/logout/');
  },

  getMe: async (): Promise<User> => {
    return api.get('/auth/me/');
  },
};
