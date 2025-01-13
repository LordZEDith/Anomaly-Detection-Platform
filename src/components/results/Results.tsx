import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { cn } from '../../lib/utils';
import { ModelDetails } from './ModelDetails';
import { Filter, Check } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import supportedSymbols from '../../data/supported_symbols.json';

interface ModelMetrics {
  accuracy: number;
  roc_auc?: number;
  class_0: {
    precision: number;
    recall: number;
    'f1-score': number;
    support: number;
  };
  class_1: {
    precision: number;
    recall: number;
    'f1-score': number;
    support: number;
  };
  macro_avg: {
    precision: number;
    recall: number;
    'f1-score': number;
    support: number;
  };
  weighted_avg: {
    precision: number;
    recall: number;
    'f1-score': number;
    support: number;
  };
  confusion_matrix: number[][];
}

interface SupervisedModels {
  xgboost: ModelMetrics;
  gradient_boosting: ModelMetrics;
  random_forest: ModelMetrics;
  neural_net: ModelMetrics;
  svm: ModelMetrics;
  voting_ensemble: ModelMetrics;
}

interface UnsupervisedModels {
  isolation_forest: ModelMetrics;
  gaussian_mixture: ModelMetrics;
  elliptic_envelope: ModelMetrics;
}

interface BestModel {
  model_name: string;
  metrics: ModelMetrics;
}

interface BestModels {
  supervised: BestModel;
  unsupervised: BestModel;
}

interface StrategyData {
  features_used: string[];
  supervised_models: SupervisedModels;
  unsupervised_models: UnsupervisedModels;
  best_models: BestModels;
}

interface StrategyResults {
  timestamp: string;
  strategies: {
    [key: string]: StrategyData;
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

interface StrategyFeatures {
  base: string[];
  derived: string[];
}

interface Strategy {
  id: number;
  name: string;
  folder: string;
  features: StrategyFeatures;
}

interface FilterMetric {
  name: string;
  key: 'accuracy' | 'roc_auc' | 'precision' | 'recall';
  active: boolean;
}

const formatMetric = (value: number | undefined) => {
  if (value === undefined) return 'N/A';
  return (value * 100).toFixed(2) + '%';
};

const getMetricColor = (value: number | undefined) => {
  if (value === undefined) return 'text-gray-400';
  const percentage = value * 100;
  if (percentage >= 80) return 'text-emerald-400';
  if (percentage >= 60) return 'text-amber-400';
  return 'text-red-400';
};

export const Results: React.FC = () => {
  const [results, setResults] = useState<StrategyResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [filters, setFilters] = useState<FilterMetric[]>([
    { name: 'Accuracy', key: 'accuracy', active: false },
    { name: 'ROC AUC', key: 'roc_auc', active: false },
    { name: 'Precision', key: 'precision', active: false },
    { name: 'Recall', key: 'recall', active: false },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resultsResponse, strategiesResponse] = await Promise.all([
          fetch('/anomaly_models/results/consolidated_results.json'),
          fetch('/anomaly_models/prepared_data/strategies.json')
        ]);

        if (!resultsResponse.ok || !strategiesResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const [resultsData, strategiesData] = await Promise.all([
          resultsResponse.json(),
          strategiesResponse.json()
        ]);

        setResults(resultsData);
        setStrategies(strategiesData.strategies || []);
      } catch (err) {
        setError('Failed to load data');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getBestModel = (models: SupervisedModels | UnsupervisedModels) => {
    return Object.entries(models).reduce((best, [model, data]) => {
      if (!best || data.accuracy > best.metrics.accuracy) {
        return { model, metrics: data };
      }
      return best;
    }, null as { model: string; metrics: ModelMetrics } | null);
  };

  const getStrategyInfo = (folder: string) => {
    const strategy = strategies.find(s => s.folder === folder);
    return strategy ? { id: strategy.id, name: strategy.name } : null;
  };

  const toggleFilter = (key: FilterMetric['key']) => {
    setFilters(filters.map(filter => 
      filter.key === key ? { ...filter, active: !filter.active } : filter
    ));
  };

  const filterAndSortStrategies = (strategies: Array<{
    strategyName: string;
    strategyData: StrategyData;
    bestModel: { model: string; metrics: ModelMetrics };
    strategyInfo: { id: number; name: string };
  }>) => {
    const activeFilters = filters.filter(f => f.active);
    
    // First filter the strategies
    const filteredStrategies = activeFilters.length === 0 ? strategies :
      strategies.filter(({ bestModel }) => {
        return activeFilters.every(filter => {
          const value = filter.key === 'accuracy' ? 
            bestModel.metrics[filter.key] :
            filter.key === 'roc_auc' ? 
              bestModel.metrics[filter.key] :
              bestModel.metrics.macro_avg[filter.key];
          return value !== undefined && value >= 0.6; // 60% threshold
        });
      });

    // Then sort based on the first active filter, or by strategy ID if no filters
    if (activeFilters.length > 0) {
      const sortFilter = activeFilters[0];
      return filteredStrategies.sort((a, b) => {
        const aValue = sortFilter.key === 'accuracy' ? 
          a.bestModel.metrics[sortFilter.key] :
          sortFilter.key === 'roc_auc' ? 
            a.bestModel.metrics[sortFilter.key] :
            a.bestModel.metrics.macro_avg[sortFilter.key];
        const bValue = sortFilter.key === 'accuracy' ? 
          b.bestModel.metrics[sortFilter.key] :
          sortFilter.key === 'roc_auc' ? 
            b.bestModel.metrics[sortFilter.key] :
            b.bestModel.metrics.macro_avg[sortFilter.key];
            
        // Handle undefined values
        if (aValue === undefined && bValue === undefined) return 0;
        if (aValue === undefined) return 1;
        if (bValue === undefined) return -1;
        
        // Sort in descending order (highest first)
        return bValue - aValue;
      });
    }

    // Default sort by strategy ID
    return filteredStrategies.sort((a, b) => a.strategyInfo.id - b.strategyInfo.id);
  };

  // Get all supported features from the supported_symbols.json
  const allCategories = Object.values(supportedSymbols.supported_symbols)
    .filter(category => typeof category === 'object' && !Array.isArray(category))
    .reduce((acc: string[], category) => {
      if (typeof category === 'object' && !Array.isArray(category)) {
        return [...acc, ...Object.keys(category)];
      }
      return acc;
    }, []);

  // Check if a strategy is useable based on supported symbols
  const isStrategyUseable = (strategy: Strategy) => {
    return strategy.features.base.every(feature => allCategories.includes(feature));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="bg-red-900/20 border border-red-600 text-red-400 px-4 py-3 rounded relative" role="alert">
        <span className="block sm:inline">{error || 'No results available'}</span>
      </div>
    );
  }

  if (selectedStrategy && results) {
    const strategyData = results.strategies[selectedStrategy];
    const strategyInfo = getStrategyInfo(selectedStrategy);
    return (
      <ModelDetails
        data={{ ...strategyData.supervised_models, ...strategyData.unsupervised_models }}
        title={strategyInfo ? `Strategy ${strategyInfo.id}: ${strategyInfo.name}` : selectedStrategy}
        type="supervised"
        onBack={() => setSelectedStrategy(null)}
        strategyName={selectedStrategy}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#151821] text-gray-100 p-8 overflow-y-auto scrollbar-thin scrollbar-track-gray-900/20 scrollbar-thumb-gray-700/50">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">
              Strategy Results
            </h1>
            <p className="text-gray-400 mt-3 text-lg">
              Analysis of {Object.keys(results.strategies).length} different strategies
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="hover:bg-blue-500/10 hover:text-blue-400"
              >
                <Filter className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-[#1c1f2e] border-gray-800">
              {filters.map((filter) => (
                <DropdownMenuCheckboxItem
                  key={filter.key}
                  checked={filter.active}
                  onCheckedChange={() => toggleFilter(filter.key)}
                  className="text-gray-200 focus:text-gray-200 focus:bg-blue-500/10"
                >
                  {filter.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Separator className="my-6 bg-gray-800/50" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filterAndSortStrategies(Object.entries(results.strategies)
          .map(([strategyName, strategyData]) => {
            const bestModel = getBestModel({ ...strategyData.supervised_models, ...strategyData.unsupervised_models });
            const strategyInfo = getStrategyInfo(strategyName);
            if (!bestModel || !strategyInfo) return null;
            return { strategyName, strategyData, bestModel, strategyInfo };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null))
          .map(({ strategyName, bestModel, strategyInfo }) => {
            const strategy = strategies.find(s => s.id === strategyInfo.id);
            const isUseable = strategy ? isStrategyUseable(strategy) : false;

            return (
              <Card 
                key={strategyName}
                className="bg-[#1c1f2e]/40 backdrop-blur-sm border border-gray-800/50 shadow-xl text-gray-100 transition-all duration-300 hover:ring-1 hover:ring-blue-400/30 hover:shadow-2xl hover:shadow-blue-500/5 cursor-pointer"
                onClick={() => setSelectedStrategy(strategyName)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div className="flex items-center space-x-3">
                    <CardTitle className="text-xl font-semibold tracking-tight">
                      Strategy {strategyInfo.id}: {strategyInfo.name}
                    </CardTitle>
                    <div className={cn(
                      "text-xs font-medium px-2 py-1 rounded-full",
                      isUseable 
                        ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30"
                        : "bg-red-500/10 text-red-400 ring-1 ring-red-500/30"
                    )}>
                      {isUseable ? "Useable" : "Unuseable"}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-gray-400 text-sm font-medium">Best Model</p>
                    <p className="text-white font-medium">
                      {bestModel.model}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-gray-400 text-sm font-medium">Accuracy</p>
                      <p className={cn("font-semibold text-lg", getMetricColor(bestModel.metrics.accuracy))}>
                        {formatMetric(bestModel.metrics.accuracy)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-gray-400 text-sm font-medium">ROC AUC</p>
                      <p className={cn("font-semibold text-lg", getMetricColor(bestModel.metrics.roc_auc))}>
                        {formatMetric(bestModel.metrics.roc_auc)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-gray-400 text-sm font-medium">Precision</p>
                      <p className={cn("font-semibold text-lg", getMetricColor(bestModel.metrics.macro_avg.precision))}>
                        {formatMetric(bestModel.metrics.macro_avg.precision)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-gray-400 text-sm font-medium">Recall</p>
                      <p className={cn("font-semibold text-lg", getMetricColor(bestModel.metrics.macro_avg.recall))}>
                        {formatMetric(bestModel.metrics.macro_avg.recall)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}; 