import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000 // 60 seconds for code execution
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth operations
export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const register = async (name, email, password) => {
  const response = await api.post('/auth/register', { name, email, password });
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const updateStoredUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

// Execute code
export const executeCode = async (code, language, stdin = '') => {
  const response = await api.post('/execute', { code, language, stdin });
  return response.data;
};

// File operations
export const getFiles = async () => {
  const user = getCurrentUser();
  const userId = user?.id;
  const response = await api.get('/files', { params: { userId } });
  return response.data;
};

export const getFile = async (id) => {
  const response = await api.get(`/files/${id}`);
  return response.data;
};

export const saveFile = async ({ id, name, content, language }) => {
  const user = getCurrentUser();
  const userId = user?.id;
  if (id) {
    const response = await api.put(`/files/${id}`, { name, content, language });
    return response.data;
  } else {
    const response = await api.post('/files', { name, content, language, userId });
    return response.data;
  }
};

export const deleteFile = async (id) => {
  const response = await api.delete(`/files/${id}`);
  return response.data;
};

// Payment operations
export const getUserPlan = async () => {
  const response = await api.get('/payment/plan');
  return response.data;
};

export const createCheckout = async () => {
  const response = await api.post('/payment/create-checkout');
  return response.data;
};

export const verifyPayment = async (paymentData) => {
  const response = await api.post('/payment/verify', paymentData);
  return response.data;
};

export const demoUpgrade = async () => {
  const response = await api.post('/payment/demo-upgrade');
  return response.data;
};

// GitHub operations
export const getGitHubStatus = async () => {
  const response = await api.get('/github/status');
  return response.data;
};

export const getGitHubAuthUrl = async () => {
  const response = await api.get('/github/auth-url');
  return response.data;
};

export const disconnectGitHub = async () => {
  const response = await api.post('/github/disconnect');
  return response.data;
};

export const getGitHubRepos = async () => {
  const response = await api.get('/github/repos');
  return response.data;
};

export const createGitHubRepo = async (name, isPrivate = false, description = '') => {
  const response = await api.post('/github/repos', { name, isPrivate, description });
  return response.data;
};

export const pushToGitHub = async ({ owner, repo, filePath, content, commitMessage, branch }) => {
  const response = await api.post('/github/push', { 
    owner, repo, filePath, content, commitMessage, branch 
  });
  return response.data;
};

export default api;
