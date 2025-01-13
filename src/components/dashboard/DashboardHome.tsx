import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Separator } from '../ui/separator';
import { useNavigate } from 'react-router-dom';
import { BarChart2, LineChart, TrendingUp } from 'lucide-react';
import supportedSymbols from '../../data/supported_symbols.json';

interface ModelMetrics {
  accuracy: number;
  roc_auc?: number;
  macro_avg: {
    precision: number;
    recall: number;
    'f1-score': number;
  };
}

interface Strategy {
  id: number;
  name: string;
  folder: string;
  features: {
    base: string[];
    derived: string[];
  };
}

interface StrategyResults {
  timestamp: string;
  strategies: {
    [key: string]: {
      features_used: string[];
      supervised_models: {
        xgboost: ModelMetrics;
        gradient_boosting: ModelMetrics;
        random_forest: ModelMetrics;
        neural_net: ModelMetrics;
        svm: ModelMetrics;
        voting_ensemble: ModelMetrics;
      };
      unsupervised_models: {
        isolation_forest: ModelMetrics;
        gaussian_mixture: ModelMetrics;
        elliptic_envelope: ModelMetrics;
      };
      best_models: {
        supervised: { model_name: string; metrics: ModelMetrics };
        unsupervised: { model_name: string; metrics: ModelMetrics };
      };
    };
  };
  overall_best: {
    anomaly_detection: {
      strategy: string;
      model: string;
      precision: number;
      recall: number;
      f1_score: number;
    };
    normal_detection: {
      strategy: string;
      model: string;
      precision: number;
      recall: number;
      f1_score: number;
    };
    overall: {
      strategy: string;
      model: string;
      accuracy: number;
      f1_score: number;
    };
  };
}

interface StrategyResponse {
  strategies: Strategy[];
}

export const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [results, setResults] = useState<StrategyResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [strategiesResponse, resultsResponse] = await Promise.all([
          fetch('/anomaly_models/prepared_data/strategies.json'),
          fetch('/anomaly_models/results/consolidated_results.json')
        ]);

        if (!strategiesResponse.ok || !resultsResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const [strategiesData, resultsData] = await Promise.all([
          strategiesResponse.json(),
          resultsResponse.json()
        ]);

        setStrategies(strategiesData.strategies || []);
        setResults(resultsData);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const allCategories = Object.values(supportedSymbols.supported_symbols)
    .filter(category => typeof category === 'object' && !Array.isArray(category))
    .reduce((acc: string[], category) => {
      if (typeof category === 'object' && !Array.isArray(category)) {
        return [...acc, ...Object.keys(category)];
      }
      return acc;
    }, []);

  const getUseableStrategies = () => {
    return strategies.filter(strategy => 
      strategy.features.base.every(feature => allCategories.includes(feature))
    );
  };

  const getModelStats = () => {
    const totalModels = strategies.length * 9; // 9 models per strategy
    const useableModels = getUseableStrategies().length * 9;
    const unusableModels = totalModels - useableModels;
    return { totalModels, useableModels, unusableModels };
  };

  const quickActions = [
    {
      icon: <BarChart2 className="w-6 h-6 text-blue-400" />,
      title: 'View Strategies',
      description: 'Explore and analyze different anomaly detection approaches',
      path: '/dashboard/strategies',
      color: 'blue'
    },
    {
      icon: <LineChart className="w-6 h-6 text-emerald-400" />,
      title: 'Analytics',
      description: 'View performance metrics and insights',
      path: '/dashboard/results',
      color: 'emerald'
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-violet-400" />,
      title: 'Live Charts',
      description: 'Real-time market analysis and predictions',
      path: '/dashboard/charts',
      color: 'violet'
    }
  ];

  const getBestPerformance = () => {
    if (!results) return null;
    return {
      bestAccuracy: results.overall_best.overall.accuracy * 100,
      bestF1Score: results.overall_best.overall.f1_score * 100,
      bestStrategy: results.overall_best.overall.strategy,
      bestModel: results.overall_best.overall.model,
      anomalyDetection: {
        precision: results.overall_best.anomaly_detection.precision * 100,
        recall: results.overall_best.anomaly_detection.recall * 100,
        f1Score: results.overall_best.anomaly_detection.f1_score * 100,
      },
      normalDetection: {
        precision: results.overall_best.normal_detection.precision * 100,
        recall: results.overall_best.normal_detection.recall * 100,
        f1Score: results.overall_best.normal_detection.f1_score * 100,
      }
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const useableStrategies = getUseableStrategies();
  const bestPerformance = getBestPerformance();

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-[#171A27] via-[#171A27] to-[#171A27] text-gray-100 p-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">
          Welcome to Anomaly Detection Platform
        </h1>
        <p className="text-gray-400 mt-3 text-lg">
          Your central hub for managing and analyzing market anomalies
        </p>
        <Separator className="my-6 bg-gray-800/50" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {quickActions.map((action, index) => (
          <button
            key={index}
            onClick={() => navigate(action.path)}
            className={`bg-[#1c1f2e]/40 backdrop-blur-sm border border-gray-800/50 shadow-xl p-6 rounded-lg hover:ring-1 hover:ring-${action.color}-400/30 hover:shadow-2xl hover:shadow-${action.color}-500/5 transition-all duration-300 text-left h-full`}
          >
            <div className="mb-3">{action.icon}</div>
            <h3 className="text-lg font-semibold text-white mb-2">{action.title}</h3>
            <p className="text-gray-400">{action.description}</p>
          </button>
        ))}
      </div>

      {/* System Status */}
      <div className="mt-8 grid grid-rows-2 gap-8 flex-1">
        <div className="bg-[#1c1f2e]/40 backdrop-blur-sm border border-gray-800/50 shadow-xl rounded-lg p-8 hover:ring-1 hover:ring-blue-400/30 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-300">
          <h2 className="text-2xl font-semibold text-white mb-8">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10 h-[calc(100%-5rem)]">
            <div className="bg-[#1c1f2e]/60 p-6 rounded-lg border border-gray-800/30 flex flex-col">
              <h3 className="text-lg font-medium text-gray-400 mb-4">Model Overview</h3>
              <div className="space-y-6 flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between group">
                  <span className="text-gray-400 group-hover:text-white transition-colors">Total Models</span>
                  <span className="text-blue-400 text-lg font-semibold">{getModelStats().totalModels}</span>
                </div>
                <div className="flex items-center justify-between group">
                  <span className="text-gray-400 group-hover:text-white transition-colors">Useable Models</span>
                  <span className="text-emerald-400 text-lg font-semibold">{getModelStats().useableModels}</span>
                </div>
                <div className="flex items-center justify-between group">
                  <span className="text-gray-400 group-hover:text-white transition-colors">Unusable Models</span>
                  <span className="text-rose-400 text-lg font-semibold">{getModelStats().unusableModels}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#1c1f2e]/60 p-6 rounded-lg border border-gray-800/30 flex flex-col">
              <h3 className="text-lg font-medium text-gray-400 mb-4">Strategy Overview</h3>
              <div className="space-y-6 flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between group">
                  <span className="text-gray-400 group-hover:text-white transition-colors">Total Strategies</span>
                  <span className="text-blue-400 text-lg font-semibold">{strategies.length}</span>
                </div>
                <div className="flex items-center justify-between group">
                  <span className="text-gray-400 group-hover:text-white transition-colors">Useable Strategies</span>
                  <span className="text-emerald-400 text-lg font-semibold">{useableStrategies.length}</span>
                </div>
                <div className="flex items-center justify-between group">
                  <span className="text-gray-400 group-hover:text-white transition-colors">Unusable Strategies</span>
                  <span className="text-rose-400 text-lg font-semibold">{strategies.length - useableStrategies.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#1c1f2e]/60 p-6 rounded-lg border border-gray-800/30 flex flex-col">
              <h3 className="text-lg font-medium text-gray-400 mb-4">System Health</h3>
              <div className="space-y-6 flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between group">
                  <span className="text-gray-400 group-hover:text-white transition-colors">Model Health</span>
                  <span className={getModelStats().useableModels === getModelStats().totalModels ? "text-emerald-400 text-lg font-semibold" : "text-amber-400 text-lg font-semibold"}>
                    {Math.round((getModelStats().useableModels / getModelStats().totalModels) * 100)}%
                  </span>
                </div>
                <div className="flex items-center justify-between group">
                  <span className="text-gray-400 group-hover:text-white transition-colors">Strategy Health</span>
                  <span className={useableStrategies.length === strategies.length ? "text-emerald-400 text-lg font-semibold" : "text-amber-400 text-lg font-semibold"}>
                    {Math.round((useableStrategies.length / strategies.length) * 100)}%
                  </span>
                </div>
                <div className="flex items-center justify-between group">
                  <span className="text-gray-400 group-hover:text-white transition-colors">Last Updated</span>
                  <span className="text-gray-400 text-lg font-semibold">Just Now</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Section */}
        <div className="bg-[#1c1f2e]/40 backdrop-blur-sm border border-gray-800/50 shadow-xl rounded-lg p-8 hover:ring-1 hover:ring-blue-400/30 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-300">
          <h2 className="text-2xl font-semibold text-white mb-8">Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10 h-[calc(100%-5rem)]">
            <div className="bg-[#1c1f2e]/60 p-6 rounded-lg border border-gray-800/30 flex flex-col">
              <h3 className="text-lg font-medium text-gray-400 mb-4">Overall Performance</h3>
              <div className="space-y-6 flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between group">
                  <span className="text-gray-400 group-hover:text-white transition-colors">Best Accuracy</span>
                  <span className="text-emerald-400 text-lg font-semibold">
                    {bestPerformance ? `${bestPerformance.bestAccuracy.toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between group">
                  <span className="text-gray-400 group-hover:text-white transition-colors">Best F1 Score</span>
                  <span className="text-emerald-400 text-lg font-semibold">
                    {bestPerformance ? `${bestPerformance.bestF1Score.toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between group">
                  <span className="text-gray-400 group-hover:text-white transition-colors">Best Model</span>
                  <span className="text-violet-400 text-lg font-semibold">
                    {bestPerformance?.bestModel || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#1c1f2e]/60 p-6 rounded-lg border border-gray-800/30 flex flex-col">
              <h3 className="text-lg font-medium text-gray-400 mb-4">Anomaly Detection</h3>
              <div className="space-y-6 flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between group">
                  <span className="text-gray-400 group-hover:text-white transition-colors">Precision</span>
                  <span className="text-emerald-400 text-lg font-semibold">
                    {bestPerformance ? `${bestPerformance.anomalyDetection.precision.toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between group">
                  <span className="text-gray-400 group-hover:text-white transition-colors">Recall</span>
                  <span className="text-emerald-400 text-lg font-semibold">
                    {bestPerformance ? `${bestPerformance.anomalyDetection.recall.toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between group">
                  <span className="text-gray-400 group-hover:text-white transition-colors">F1 Score</span>
                  <span className="text-emerald-400 text-lg font-semibold">
                    {bestPerformance ? `${bestPerformance.anomalyDetection.f1Score.toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#1c1f2e]/60 p-6 rounded-lg border border-gray-800/30 flex flex-col">
              <h3 className="text-lg font-medium text-gray-400 mb-4">Normal Detection</h3>
              <div className="space-y-6 flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between group">
                  <span className="text-gray-400 group-hover:text-white transition-colors">Precision</span>
                  <span className="text-emerald-400 text-lg font-semibold">
                    {bestPerformance ? `${bestPerformance.normalDetection.precision.toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between group">
                  <span className="text-gray-400 group-hover:text-white transition-colors">Recall</span>
                  <span className="text-emerald-400 text-lg font-semibold">
                    {bestPerformance ? `${bestPerformance.normalDetection.recall.toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between group">
                  <span className="text-gray-400 group-hover:text-white transition-colors">F1 Score</span>
                  <span className="text-emerald-400 text-lg font-semibold">
                    {bestPerformance ? `${bestPerformance.normalDetection.f1Score.toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 