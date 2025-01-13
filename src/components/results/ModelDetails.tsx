import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ArrowLeft, Filter } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Separator } from '../ui/separator';
import { ModelExpand } from './ModelExpand';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

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

interface ModelDetailsProps {
  data: Record<string, ModelMetrics>;
  title: string;
  type: 'supervised' | 'unsupervised';
  onBack: () => void;
  strategyName: string;
}

const MODEL_NAMES: Record<string, string> = {
  xgboost: 'XGBoost',
  gradient_boosting: 'Gradient Boosting',
  random_forest: 'Random Forest',
  neural_net: 'Neural Network',
  svm: 'Support Vector Machine',
  voting_ensemble: 'Voting Ensemble',
  isolation_forest: 'Isolation Forest',
  gaussian_mixture: 'Gaussian Mixture',
  elliptic_envelope: 'Elliptic Envelope'
};

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

interface FilterMetric {
  name: string;
  key: 'accuracy' | 'roc_auc' | 'normal' | 'anomaly';
  active: boolean;
}

export const ModelDetails: React.FC<ModelDetailsProps> = ({ data, title, onBack, strategyName }) => {
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterMetric[]>([
    { name: 'Accuracy', key: 'accuracy', active: false },
    { name: 'ROC AUC', key: 'roc_auc', active: false },
    { name: 'Normal (F1)', key: 'normal', active: false },
    { name: 'Anomaly (F1)', key: 'anomaly', active: false },
  ]);

  const toggleFilter = (key: FilterMetric['key']) => {
    setFilters(filters.map(filter => {
      if (filter.key === key) {
        // Deactivate other filters when one is activated
        return { ...filter, active: !filter.active };
      }
      return { ...filter, active: false };
    }));
  };

  const sortModels = (models: Array<[string, ModelMetrics]>) => {
    const activeFilter = filters.find(f => f.active);
    if (!activeFilter) {
      // Default sorting - keep original order
      return models;
    }

    return [...models].sort((a, b) => {
      let aValue: number | undefined;
      let bValue: number | undefined;

      switch (activeFilter.key) {
        case 'accuracy':
          aValue = a[1].accuracy;
          bValue = b[1].accuracy;
          break;
        case 'roc_auc':
          aValue = a[1].roc_auc;
          bValue = b[1].roc_auc;
          break;
        case 'normal':
          aValue = a[1].class_0['f1-score'];
          bValue = b[1].class_0['f1-score'];
          break;
        case 'anomaly':
          aValue = a[1].class_1['f1-score'];
          bValue = b[1].class_1['f1-score'];
          break;
      }

      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;
      
      // Sort in descending order (highest first)
      return bValue - aValue;
    });
  };

  const renderModelMetrics = (modelName: string, metrics: ModelMetrics) => {
    const displayName = MODEL_NAMES[modelName] || modelName;

    return (
      <Card 
        key={modelName}
        onClick={() => setExpandedModel(modelName)}
        className="relative bg-[#1c1f2e]/40 backdrop-blur-sm border border-gray-800/50 shadow-xl text-gray-100 transition-all duration-300 hover:border-blue-400/30 hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer group before:absolute before:inset-0 before:rounded-lg before:transition-all before:duration-300 hover:before:ring-1 hover:before:ring-blue-400/30"
      >
        <CardHeader 
          className="relative flex flex-row items-center justify-between space-y-0 pb-4"
        >
          <CardTitle className="text-xl font-semibold tracking-tight">
            {displayName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-gray-400 text-sm font-medium">Accuracy</p>
              <p className={cn("font-semibold text-lg", getMetricColor(metrics.accuracy))}>
                {formatMetric(metrics.accuracy)}
              </p>
            </div>
            {metrics.roc_auc && (
              <div className="space-y-2">
                <p className="text-gray-400 text-sm font-medium">ROC AUC</p>
                <p className={cn("font-semibold text-lg", getMetricColor(metrics.roc_auc))}>
                  {formatMetric(metrics.roc_auc)}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-6 pb-4">
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-3">Class Performance:</h4>
              <div className="grid grid-cols-2 gap-x-6">
                <div>
                  <p className="text-gray-400 text-sm">Normal (Class 0)</p>
                  <p className={cn("mt-1", getMetricColor(metrics.class_0['f1-score']))}>
                    F1: {formatMetric(metrics.class_0['f1-score'])}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Anomaly (Class 1)</p>
                  <p className={cn("mt-1", getMetricColor(metrics.class_1['f1-score']))}>
                    F1: {formatMetric(metrics.class_1['f1-score'])}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-2">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Confusion Matrix:</h4>
              <p className="text-gray-300">
                {metrics.confusion_matrix[0][0] + metrics.confusion_matrix[1][1]} correct predictions, {metrics.confusion_matrix[0][1] + metrics.confusion_matrix[1][0]} misclassifications
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#151821] text-gray-100 p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={onBack}
            className="flex items-center text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Strategies
          </button>
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
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">
          {title}
        </h1>
        <Separator className="my-6 bg-gray-800/50" />
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-y-auto scrollbar-thin scrollbar-track-gray-900/20 scrollbar-thumb-gray-700/50">
        {sortModels(Object.entries(data)).map(([modelName, metrics]) => renderModelMetrics(modelName, metrics))}
      </div>

      {expandedModel && data[expandedModel] && (
        <ModelExpand
          modelName={expandedModel}
          metrics={data[expandedModel]}
          allModels={data}
          onClose={() => setExpandedModel(null)}
          strategyName={strategyName}
        />
      )}
    </div>
  );
}; 