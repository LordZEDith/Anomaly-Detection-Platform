import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Login } from './components/auth/Login';
import { InstallationWizard } from './components/auth/InstallationWizard';
import { Dashboard } from './components/dashboard/Dashboard';
import { DashboardHome } from './components/dashboard/DashboardHome';
import { Strategy } from './components/strategy/Strategy';
import { PrivateRoute } from './components/auth/PrivateRoute';
import { Results } from './components/results/Results';
import { Charts } from './components/charts/Charts';

interface InstallationStatus {
  installed: boolean;
}

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    const checkInstallation = async () => {
      try {
        const response = await axios.get<InstallationStatus>('/api/install/status');
        setIsInstalled(response.data.installed);
      } catch (error) {
        console.error('Failed to check installation status:', error);
        setIsInstalled(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkInstallation();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Redirect install to login */}
        <Route 
          path="/install" 
          element={<Navigate to="/login" replace />} 
        />

        {/* Login decides where to go */}
        <Route 
          path="/login" 
          element={
            <Login 
              isInstalled={isInstalled} 
              onInstallComplete={() => setIsInstalled(true)} 
            />
          } 
        />

        {/* Protected Routes */}
        <Route element={<PrivateRoute><Dashboard /></PrivateRoute>}>
          <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="/dashboard/strategies" element={<Strategy />} />
          <Route path="/dashboard/results" element={<Results />} />
          <Route path="/dashboard/charts" element={<Charts />} />
        </Route>

        {/* Default Route */}
        <Route 
          path="*" 
          element={<Navigate to="/login" replace />} 
        />
      </Routes>
    </Router>
  );
};

export default App; 