import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart2, LineChart, TrendingUp, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';

export const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const isActive = (path: string) => {
    return location.pathname.includes(path);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#151821]">
      {/* Sidebar */}
      <div className="w-64 bg-[#1c1f2e]/40 backdrop-blur-sm border-r border-gray-800/50 shadow-xl flex flex-col z-10">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">
            Anomaly Detection
          </h1>
        </div>
        <nav className="mt-4 space-y-1 px-3 flex-1">
          <Link
            to="/dashboard"
            className={`flex items-center px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-[#343d52]/50 transition-all duration-200 group ${
              location.pathname === '/dashboard' ? 'bg-[#343d52]/70 text-white shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/20' : ''
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mr-3 group-hover:text-blue-400 transition-colors" />
            Dashboard
          </Link>
          <Link
            to="/dashboard/strategies"
            className={`flex items-center px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-[#343d52]/50 transition-all duration-200 group ${
              isActive('strategies') ? 'bg-[#343d52]/70 text-white shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/20' : ''
            }`}
          >
            <BarChart2 className="w-5 h-5 mr-3 group-hover:text-blue-400 transition-colors" />
            Strategies
          </Link>
          <Link
            to="/dashboard/results"
            className={`flex items-center px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-[#343d52]/50 transition-all duration-200 group ${
              isActive('results') ? 'bg-[#343d52]/70 text-white shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/20' : ''
            }`}
          >
            <LineChart className="w-5 h-5 mr-3 group-hover:text-blue-400 transition-colors" />
            Results
          </Link>
          <Link
            to="/dashboard/charts"
            className={`flex items-center px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-[#343d52]/50 transition-all duration-200 group ${
              isActive('charts') ? 'bg-[#343d52]/70 text-white shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/20' : ''
            }`}
          >
            <TrendingUp className="w-5 h-5 mr-3 group-hover:text-blue-400 transition-colors" />
            Charts
          </Link>
        </nav>
        <div className="p-4 space-y-4">
          <Button
            variant="ghost"
            className="w-full flex justify-start text-gray-400 hover:text-white hover:bg-[#343d52]/50"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
          <div className="text-sm text-gray-400 text-start border-t border-gray-800/50 pt-4 px-4">
            Made by <a href="https://github.com/LordZEDith" className="text-blue-400 hover:text-blue-500 transition-colors">ZEDith</a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative">
        <div className="absolute inset-0 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}; 