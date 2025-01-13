import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios, { AxiosError } from 'axios';
import { useAuth } from '../../hooks/useAuth';
import { InstallationWizard } from './InstallationWizard';

interface Credentials {
  email: string;
  password: string;
}

interface ApiResponse {
  token: string;
  user: {
    email: string;
    id: number;
    role: string;
  };
}

interface Props {
  isInstalled: boolean;
  onInstallComplete: () => void;
}

export const Login: React.FC<Props> = ({ isInstalled, onInstallComplete }) => {
  if (!isInstalled) {
    return <InstallationWizard onInstallComplete={onInstallComplete} />;
  }

  const [credentials, setCredentials] = useState<Credentials>({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Attempting login with:', { email: credentials.email });
      const response = await axios.post<ApiResponse>('/api/auth/login', credentials);
      console.log('Login response:', response.data);
      
      if (response.data.token && response.data.user) {
        console.log('Login successful, setting token');
        localStorage.setItem('auth_token', response.data.token);
        login(credentials);
        navigate('/dashboard', { replace: true });
      } else {
        console.error('Login failed: Invalid response format');
        setError('Invalid server response. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof AxiosError) {
        if (err.response?.status === 401) {
          setError('Invalid email or password');
        } else if (err.response?.data?.error) {
          setError(err.response.data.error);
        } else if (err.code === 'ERR_NETWORK') {
          setError('Unable to connect to the server. Please check your internet connection.');
        } else {
          setError('An error occurred during login. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#171A25] flex flex-col justify-center">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">
            Anomaly Detection Platform
          </h2>
          <p className="mt-2 text-gray-400">
            Sign in to your account
          </p>
        </div>

        <div className="bg-[#1c1f2e]/40 backdrop-blur-sm border border-gray-800/50 shadow-xl p-8 rounded-lg hover:ring-1 hover:ring-blue-400/30 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-300">
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label 
                htmlFor="email" 
                className="block text-sm font-medium text-gray-400"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={credentials.email}
                onChange={(e) => setCredentials(prev => ({ 
                  ...prev, 
                  email: e.target.value 
                }))}
                className="mt-1 block w-full px-3 py-2 bg-[#1a1f2c] border border-gray-800 rounded-md shadow-sm text-gray-300 focus:ring-blue-500/20 focus:border-blue-500/40 focus:outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-gray-400"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ 
                  ...prev, 
                  password: e.target.value 
                }))}
                className="mt-1 block w-full px-3 py-2 bg-[#1a1f2c] border border-gray-800 rounded-md shadow-sm text-gray-300 focus:ring-blue-500/20 focus:border-blue-500/40 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-end">
              <div className="text-sm">
                <a href="#" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                  Forgot your password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}; 