import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('reachinbox_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  getGoogleLoginUrl: () => `${API_BASE_URL}/auth/google`,
  devLogin: async () => {
    const res = await apiClient.post('/auth/dev-login');
    return res.data;
  },
  getMe: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
  logout: async () => {
    const res = await apiClient.post('/auth/logout');
    localStorage.removeItem('reachinbox_token');
    return res.data;
  },
};

export const campaignApi = {
  create: async (data: {
    subject: string;
    body: string;
    startTime: string;
    delayMs: number;
    hourlyLimit: number;
    senderId?: string;
    recipients: string[];
  }) => {
    const res = await apiClient.post('/campaigns', data);
    return res.data;
  },
  getAll: async () => {
    const res = await apiClient.get('/campaigns');
    return res.data;
  },
  getById: async (id: string) => {
    const res = await apiClient.get(`/campaigns/${id}`);
    return res.data;
  },
};

export const emailApi = {
  getScheduled: async (page = 1, limit = 50) => {
    const res = await apiClient.get(`/emails/scheduled?page=${page}&limit=${limit}`);
    return res.data;
  },
  getSent: async (page = 1, limit = 50) => {
    const res = await apiClient.get(`/emails/sent?page=${page}&limit=${limit}`);
    return res.data;
  },
  search: async (q: string, status?: string) => {
    const res = await apiClient.get(`/emails/search?q=${encodeURIComponent(q)}${status ? `&status=${status}` : ''}`);
    return res.data;
  },
  getStats: async () => {
    const res = await apiClient.get('/emails/stats');
    return res.data;
  },
};

export const slackApi = {
  getConnectUrl: async () => {
    const res = await apiClient.get('/slack/connect');
    return res.data;
  },
  getStatus: async () => {
    const res = await apiClient.get('/slack/status');
    return res.data;
  },
  disconnect: async () => {
    const res = await apiClient.post('/slack/disconnect');
    return res.data;
  },
  testNotification: async () => {
    const res = await apiClient.post('/slack/test');
    return res.data;
  },
};

export const senderApi = {
  getAll: async () => {
    const res = await apiClient.get('/senders');
    return res.data;
  },
  create: async (data: { email: string; name?: string; hourlyLimit?: number }) => {
    const res = await apiClient.post('/senders', data);
    return res.data;
  },
};
