import axios, { AxiosInstance, AxiosError } from 'axios';

// Anomaly Detection
export interface PredictionRequest {
  strategy: string;
  symbol: string;
  base_features: { [key: string]: string };
  interval: string;
  model: string;
}

const api: AxiosInstance = axios.create({
  baseURL: '/api'
});

// Adds auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Handles auth errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Anomaly Detection
export const predictAnomalies = async (request: PredictionRequest): Promise<any> => {
  const response = await fetch('/api/anomaly/predict', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch predictions');
  }

  return response.json();
};
