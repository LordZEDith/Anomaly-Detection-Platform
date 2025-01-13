import React, { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import axios, { AxiosError } from 'axios';
import { PLATFORM_NAME } from '../../utils/env';

interface FormData {
  dbHost: string;
  dbPort: string;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
  smtpFromEmail: string;
  smtpFromName: string;
  adminEmail: string;
  adminPassword: string;
  confirmPassword: string;
}

interface TestStatus {
  db: boolean;
  smtp: boolean;
}

interface ApiResponse {
  success: boolean;
  error?: string;
}

interface Props {
  onInstallComplete: () => void;
}

export const InstallationWizard: React.FC<Props> = ({ onInstallComplete }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [testStatus, setTestStatus] = useState<TestStatus>({ db: false, smtp: false });
  const [formData, setFormData] = useState<FormData>({
    dbHost: 'localhost',
    dbPort: '3306',
    dbName: 'anomaly_detection',
    dbUser: 'root',
    dbPassword: '',
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPassword: '',
    smtpFromEmail: '',
    smtpFromName: PLATFORM_NAME,
    adminEmail: '',
    adminPassword: '',
    confirmPassword: ''
  });

  // Check if already installed on mount
  useEffect(() => {
    const checkInstallation = async () => {
      try {
        const response = await axios.get('/api/install/status');
        if (response.data.installed) {
          navigate('/login', { replace: true });
        }
      } catch (error) {
        console.error('Failed to check installation status:', error);
      }
    };
    checkInstallation();
  }, [navigate]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (['dbHost', 'dbPort', 'dbName', 'dbUser', 'dbPassword'].includes(name)) {
      setTestStatus(prev => ({ ...prev, db: false }));
    } else if (['smtpHost', 'smtpPort', 'smtpUser', 'smtpPassword', 'smtpFromEmail'].includes(name)) {
      setTestStatus(prev => ({ ...prev, smtp: false }));
    }
  };

  const testConnection = async (type: 'db' | 'smtp'): Promise<void> => {
    setLoading(true);
    setError('');

    try {
      if (type === 'db') {
        const requiredFields = {
          'Database Host': formData.dbHost,
          'Database Port': formData.dbPort,
          'Database Name': formData.dbName,
          'Database User': formData.dbUser,
          'Database Password': formData.dbPassword
        };

        const missingFields = Object.entries(requiredFields)
          .filter(([_, value]) => !value?.trim())
          .map(([field]) => field);

        if (missingFields.length > 0) {
          setError(`Please fill in the following required fields: ${missingFields.join(', ')}`);
          return;
        }

        const response = await axios.post<ApiResponse>('/api/install/test-db', {
          host: formData.dbHost,
          port: formData.dbPort,
          name: formData.dbName,
          user: formData.dbUser,
          password: formData.dbPassword
        });

        if (response.data.success) {
          setTestStatus(prev => ({ ...prev, db: true }));
        }
      } else if (type === 'smtp') {
        const requiredFields = {
          'SMTP Host': formData.smtpHost,
          'SMTP Port': formData.smtpPort,
          'SMTP Username': formData.smtpUser,
          'SMTP Password': formData.smtpPassword,
          'From Name': formData.smtpFromName,
          'From Email': formData.smtpFromEmail
        };

        const missingFields = Object.entries(requiredFields)
          .filter(([_, value]) => !value?.trim())
          .map(([field]) => field);

        if (missingFields.length > 0) {
          setError(`Please fill in the following required fields: ${missingFields.join(', ')}`);
          return;
        }

        const response = await axios.post<ApiResponse>('/api/install/test-smtp', {
          host: formData.smtpHost,
          port: formData.smtpPort,
          user: formData.smtpUser,
          password: formData.smtpPassword,
          fromEmail: formData.smtpFromEmail,
          fromName: formData.smtpFromName
        });

        if (response.data.success) {
          setTestStatus(prev => ({ ...prev, smtp: true }));
        }
        else if (response.data.success === false) {
          const errorMessage = response.data.error || 'An unexpected error occurred. Please try again.';
          setError(errorMessage);
        }
      }
    } catch (error) {
      let errorMessage = '';
      
      if ((error as AxiosError).response) {
        errorMessage = ((error as AxiosError).response?.data as ApiResponse)?.error || 
          (type === 'db' ? 
            'Unable to connect to database. Please check your credentials and try again.' :
            'Unable to connect to SMTP server. Please check your credentials and try again.');
      } else if ((error as AxiosError).request) {
        errorMessage = 'Unable to reach the server. Please check your connection and try again.';
      } else {
        console.log(error);
        errorMessage = 'An unexpected error occurred. Please try again 1.';
      }

      setError(errorMessage);
      setTestStatus(prev => ({ ...prev, [type]: false }));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (step === 1) {
        if (!testStatus.db) {
          setError('Please test the database connection first');
          return;
        }
        setStep(2);
      } else if (step === 2) {
        if (!testStatus.smtp) {
          setError('Please test the SMTP connection first');
          return;
        }
        setStep(3);
      } else {
        if (!formData.adminEmail?.trim()) {
          setError('Please enter an admin email address');
          return;
        }

        if (!formData.adminPassword?.trim()) {
          setError('Please enter an admin password');
          return;
        }

        if (formData.adminPassword !== formData.confirmPassword) {
          setError('Passwords do not match');
          return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(formData.adminPassword)) {
          setError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character');
          return;
        }

        const response = await axios.post<ApiResponse>('/api/install/complete', {
          database: {
            host: formData.dbHost,
            port: formData.dbPort,
            name: formData.dbName,
            user: formData.dbUser,
            password: formData.dbPassword
          },
          smtp: {
            host: formData.smtpHost,
            port: formData.smtpPort,
            user: formData.smtpUser,
            password: formData.smtpPassword,
            fromEmail: formData.smtpFromEmail,
            fromName: formData.smtpFromName
          },
          admin: {
            email: formData.adminEmail,
            password: formData.adminPassword
          }
        });

        if (response.data.success) {
          localStorage.setItem('installation_complete', 'true');
          onInstallComplete();
          navigate('/login', { replace: true });
        }
      }
    } catch (error) {
      let errorMessage = '';
      
      if ((error as AxiosError).response) {
        errorMessage = ((error as AxiosError).response?.data as ApiResponse)?.error || 'Installation failed. Please try again.';
      } else if ((error as AxiosError).request) {
        errorMessage = 'Unable to reach the server. Please check your connection and try again.';
      } else {
        errorMessage = 'An unexpected error occurred. Please try again.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isDbFieldsEmpty = (): boolean => {
    return !formData.dbHost.trim() || 
           !formData.dbPort.trim() || 
           !formData.dbName.trim() || 
           !formData.dbUser.trim() || 
           !formData.dbPassword.trim();
  };

  const isSmtpFieldsEmpty = (): boolean => {
    return !formData.smtpHost.trim() || 
           !formData.smtpPort.trim() || 
           !formData.smtpUser.trim() || 
           !formData.smtpPassword.trim() || 
           !formData.smtpFromName.trim() || 
           !formData.smtpFromEmail.trim();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {PLATFORM_NAME}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {step === 1 ? 'Database Configuration' : 
           step === 2 ? 'SMTP Configuration' : 
           'Create Admin Account'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {step === 1 && (
              <>
                <div>
                  <label htmlFor="dbHost" className="block text-sm font-medium text-gray-700">
                    Database Host
                  </label>
                  <div className="mt-1">
                    <input
                      id="dbHost"
                      name="dbHost"
                      type="text"
                      required
                      value={formData.dbHost}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="localhost"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="dbPort" className="block text-sm font-medium text-gray-700">
                    Database Port
                  </label>
                  <div className="mt-1">
                    <input
                      id="dbPort"
                      name="dbPort"
                      type="text"
                      required
                      value={formData.dbPort}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="3306"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="dbName" className="block text-sm font-medium text-gray-700">
                    Database Name
                  </label>
                  <div className="mt-1">
                    <input
                      id="dbName"
                      name="dbName"
                      type="text"
                      required
                      value={formData.dbName}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="anomaly_detection"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="dbUser" className="block text-sm font-medium text-gray-700">
                    Database User
                  </label>
                  <div className="mt-1">
                    <input
                      id="dbUser"
                      name="dbUser"
                      type="text"
                      required
                      value={formData.dbUser}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="root"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="dbPassword" className="block text-sm font-medium text-gray-700">
                    Database Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="dbPassword"
                      name="dbPassword"
                      type="password"
                      value={formData.dbPassword}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => testConnection('db')}
                    disabled={loading || isDbFieldsEmpty()}
                    className={`flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      testStatus.db
                        ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                        : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                    } disabled:opacity-50`}
                  >
                    {loading ? 'Testing...' : testStatus.db ? '✓ Connection Verified' : 'Test Connection'}
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !testStatus.db}
                    className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label htmlFor="smtpHost" className="block text-sm font-medium text-gray-700">
                    SMTP Host
                  </label>
                  <div className="mt-1">
                    <input
                      id="smtpHost"
                      name="smtpHost"
                      type="text"
                      required
                      value={formData.smtpHost}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="smtpPort" className="block text-sm font-medium text-gray-700">
                    SMTP Port
                  </label>
                  <div className="mt-1">
                    <input
                      id="smtpPort"
                      name="smtpPort"
                      type="text"
                      required
                      value={formData.smtpPort}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="smtpUser" className="block text-sm font-medium text-gray-700">
                    SMTP Username
                  </label>
                  <div className="mt-1">
                    <input
                      id="smtpUser"
                      name="smtpUser"
                      type="text"
                      required
                      value={formData.smtpUser}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="smtpPassword" className="block text-sm font-medium text-gray-700">
                    SMTP Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="smtpPassword"
                      name="smtpPassword"
                      type="password"
                      required
                      value={formData.smtpPassword}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="smtpFromName" className="block text-sm font-medium text-gray-700">
                    From Name
                  </label>
                  <div className="mt-1">
                    <input
                      id="smtpFromName"
                      name="smtpFromName"
                      type="text"
                      required
                      value={formData.smtpFromName}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Anomaly Detection Platform"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="smtpFromEmail" className="block text-sm font-medium text-gray-700">
                    From Email Address
                  </label>
                  <div className="mt-1">
                    <input
                      id="smtpFromEmail"
                      name="smtpFromEmail"
                      type="email"
                      required
                      value={formData.smtpFromEmail}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => testConnection('smtp')}
                    disabled={loading || isSmtpFieldsEmpty()}
                    className={`flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      testStatus.smtp
                        ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                        : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                    } disabled:opacity-50`}
                  >
                    {loading ? 'Testing...' : testStatus.smtp ? '✓ Connection Verified' : 'Test Connection'}
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !testStatus.smtp}
                    className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700">
                    Admin Email
                  </label>
                  <div className="mt-1">
                    <input
                      id="adminEmail"
                      name="adminEmail"
                      type="email"
                      required
                      value={formData.adminEmail}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700">
                    Admin Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="adminPassword"
                      name="adminPassword"
                      type="password"
                      required
                      value={formData.adminPassword}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Installing...' : 'Complete Installation'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}; 