import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:10000/api'  // Development - your backend
  : 'https://your-production-backend.com/api'; // Production URL

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('refreshToken');
      // Navigate to login screen (you'll implement this)
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  refreshToken: () => api.post('/auth/refresh'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
};

// Cases API calls
export const casesAPI = {
  getCases: (params) => api.get('/cases', { params }),
  getCaseById: (id) => api.get(`/cases/${id}`),
  createCase: (caseData) => api.post('/cases', caseData),
  updateCase: (id, caseData) => api.put(`/cases/${id}`, caseData),
  deleteCase: (id) => api.delete(`/cases/${id}`),
  publishCase: (id) => api.patch(`/cases/${id}/publish`),
  archiveCase: (id) => api.patch(`/cases/${id}/archive`),
  getCaseStatistics: (id) => api.get(`/cases/${id}/statistics`),
  duplicateCase: (id) => api.post(`/cases/${id}/duplicate`),
};

// Simulation API calls
export const simulationAPI = {
  startSimulation: (caseId) => api.post(`/simulation/start/${caseId}`),
  processStep: (sessionId, stepData) => api.post(`/simulation/step/${sessionId}`, stepData),
  getSession: (sessionId) => api.get(`/simulation/session/${sessionId}`),
  pauseSession: (sessionId) => api.patch(`/simulation/session/${sessionId}/pause`),
  resumeSession: (sessionId) => api.patch(`/simulation/session/${sessionId}/resume`),
  abandonSession: (sessionId) => api.patch(`/simulation/session/${sessionId}/abandon`),
  submitFeedback: (sessionId, feedback) => api.post(`/simulation/session/${sessionId}/feedback`, feedback),
};

// Analytics API calls
export const analyticsAPI = {
  getUserDashboard: () => api.get('/analytics/dashboard'),
  getUserPerformance: () => api.get('/analytics/performance'),
  getCaseAnalytics: (caseId) => api.get(`/analytics/case/${caseId}`),
};

// Discussions API calls
export const discussionsAPI = {
  getDiscussions: (params) => api.get('/discussions', { params }),
  getDiscussionById: (id) => api.get(`/discussions/${id}`),
  createDiscussion: (data) => api.post('/discussions', data),
  replyToDiscussion: (id, content) => api.post(`/discussions/${id}/reply`, { content }),
  voteOnDiscussion: (id, voteType) => api.post(`/discussions/${id}/vote`, { voteType }),
  updateDiscussion: (id, content) => api.put(`/discussions/${id}`, { content }),
  deleteDiscussion: (id) => api.delete(`/discussions/${id}`),
};

// Recommendations API calls
export const recommendationsAPI = {
  getRecommendations: () => api.get('/recommendations'),
};

// Health check
export const healthAPI = {
  checkHealth: () => api.get('/health'),
};

export default api;