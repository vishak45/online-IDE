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

export default api;
