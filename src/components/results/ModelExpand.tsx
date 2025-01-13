import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

interface ModelExpandProps {
  modelName: string;
  metrics: ModelMetrics;
  allModels: Record<string, ModelMetrics>;
  onClose: () => void;
  strategyName: string;
}

interface ROCPoint {
  fpr: number;
  tpr: number;
}

interface StrategyResults {
  strategy: string;
  supervised: {
    [key: string]: {
      roc_curve: [number[], number[]];
    };
  };
  unsupervised: {
    [key: string]: {
    };
  };
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

export const ModelExpand: React.FC<ModelExpandProps> = ({ modelName, metrics, allModels, onClose, strategyName }) => {
  const [rocData, setRocData] = useState<Record<string, ROCPoint[]>>({});
  const displayName = MODEL_NAMES[modelName] || modelName;

  useEffect(() => {
    const fetchROCData = async () => {
      try {
        const response = await fetch(`/anomaly_models/results/${strategyName}/results.json`);
        if (!response.ok) throw new Error('Failed to fetch ROC data');
        
        const data: StrategyResults = await response.json();
        
        // Convert ROC curve data for each model
        const convertedData: Record<string, ROCPoint[]> = {};
        
        // Process supervised models
        Object.entries(data.supervised).forEach(([model, modelData]) => {
          if (modelData.roc_curve) {
            const [fprValues, tprValues] = modelData.roc_curve;
            convertedData[model] = fprValues.map((fpr, index) => ({
              fpr,
              tpr: tprValues[index]
            }));
          }
        });

        setRocData(convertedData);
      } catch (error) {
        console.error('Error fetching ROC data:', error);
      }
    };

    fetchROCData();
  }, [strategyName]);

  const renderROCChart = (modelName: string, metrics: ModelMetrics, allModels: Record<string, ModelMetrics>) => {
    const baselineData = [
      { fpr: 0, tpr: 0 },
      { fpr: 1, tpr: 1 }
    ];

    // Color palette for models
    const modelColors = {
      xgboost: '#60A5FA',      // blue-400
      gradient_boosting: '#34D399', // emerald-400
      random_forest: '#F472B6',  // pink-400
      neural_net: '#A78BFA',    // violet-400
      svm: '#FBBF24',          // amber-400
      voting_ensemble: '#F87171', // red-400
      isolation_forest: '#2DD4BF', // teal-400
      gaussian_mixture: '#818CF8', // indigo-400
      elliptic_envelope: '#FB923C' // orange-400
    };

    return (
      <div className="w-full h-[600px] bg-gray-800/30 rounded-lg p-4">
        <h4 className="text-lg font-medium text-white mb-4">ROC Curves Comparison</h4>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="fpr"
              type="number"
              domain={[0, 1]}
              label={{ value: "False Positive Rate", position: "bottom", offset: 10, fill: "#9CA3AF" }}
              stroke="#9CA3AF"
              tickFormatter={(value) => value.toFixed(1)}
              ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]}
            />
            <YAxis
              type="number"
              domain={[0, 1]}
              label={{ 
                value: "True Positive Rate", 
                angle: -90, 
                position: "insideLeft",
                offset: -10,
                style: {
                  fill: "#9CA3AF",
                  textAnchor: "middle"
                }
              }}
              stroke="#9CA3AF"
              tickFormatter={(value) => value.toFixed(1)}
              ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
              itemStyle={{ color: '#E5E7EB' }}
              formatter={(value: number) => value.toFixed(3)}
              labelFormatter={(value: number) => `FPR: ${value.toFixed(3)}`}
            />
            <Legend 
              verticalAlign="bottom"
              align="center"
              iconSize={10}
              wrapperStyle={{
                bottom: 40,
                lineHeight: "20px",
                width: "100%",
                paddingLeft: "40px",
                paddingRight: "40px"
              }}
            />
            {/* Render other models first */}
            {Object.entries(allModels).map(([currentModel, _]) => {
              if (currentModel === modelName || !rocData[currentModel]) return null;
              return (
                <Line
                  key={currentModel}
                  data={rocData[currentModel]}
                  type="monotone"
                  dataKey="tpr"
                  stroke={modelColors[currentModel as keyof typeof modelColors] || '#6B7280'}
                  name={MODEL_NAMES[currentModel] || currentModel}
                  dot={false}
                  strokeWidth={1.5}
                  strokeOpacity={0.7}
                />
              );
            })}
            {/* Render selected model on top with thicker line */}
            {rocData[modelName] && (
              <Line
                data={rocData[modelName]}
                type="monotone"
                dataKey="tpr"
                stroke="#3B82F6"
                name={`${MODEL_NAMES[modelName] || modelName} (Selected)`}
                dot={false}
                strokeWidth={3}
              />
            )}
            <Line
              data={baselineData}
              type="linear"
              dataKey="tpr"
              stroke="#6B7280"
              name="Baseline"
              strokeDasharray="5 5"
              dot={false}
              strokeWidth={1}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1c1f2e] rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-track-gray-900/20 scrollbar-thumb-gray-700/50">
        <div className="sticky top-0 bg-[#1c1f2e] p-6 border-b border-gray-800/50 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">{displayName}</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-gray-400 text-sm font-medium">Accuracy</p>
              <p className={cn("font-semibold text-2xl", getMetricColor(metrics.accuracy))}>
                {formatMetric(metrics.accuracy)}
              </p>
            </div>
            {metrics.roc_auc && (
              <div className="space-y-2">
                <p className="text-gray-400 text-sm font-medium">ROC AUC</p>
                <p className={cn("font-semibold text-2xl", getMetricColor(metrics.roc_auc))}>
                  {formatMetric(metrics.roc_auc)}
                </p>
              </div>
            )}
          </div>

          {renderROCChart(modelName, metrics, allModels)}

          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-white">Class 0 (Normal)</h4>
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm font-medium">Precision</p>
                  <p className={cn("font-semibold text-xl", getMetricColor(metrics.class_0.precision))}>
                    {formatMetric(metrics.class_0.precision)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm font-medium">Recall</p>
                  <p className={cn("font-semibold text-xl", getMetricColor(metrics.class_0.recall))}>
                    {formatMetric(metrics.class_0.recall)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm font-medium">F1 Score</p>
                  <p className={cn("font-semibold text-xl", getMetricColor(metrics.class_0['f1-score']))}>
                    {formatMetric(metrics.class_0['f1-score'])}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-medium text-white">Class 1 (Anomaly)</h4>
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm font-medium">Precision</p>
                  <p className={cn("font-semibold text-xl", getMetricColor(metrics.class_1.precision))}>
                    {formatMetric(metrics.class_1.precision)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm font-medium">Recall</p>
                  <p className={cn("font-semibold text-xl", getMetricColor(metrics.class_1.recall))}>
                    {formatMetric(metrics.class_1.recall)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm font-medium">F1 Score</p>
                  <p className={cn("font-semibold text-xl", getMetricColor(metrics.class_1['f1-score']))}>
                    {formatMetric(metrics.class_1['f1-score'])}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-medium text-white">Overall Metrics</h4>
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm font-medium">Precision</p>
                  <p className={cn("font-semibold text-xl", getMetricColor(metrics.macro_avg.precision))}>
                    {formatMetric(metrics.macro_avg.precision)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm font-medium">Recall</p>
                  <p className={cn("font-semibold text-xl", getMetricColor(metrics.macro_avg.recall))}>
                    {formatMetric(metrics.macro_avg.recall)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm font-medium">F1 Score</p>
                  <p className={cn("font-semibold text-xl", getMetricColor(metrics.macro_avg['f1-score']))}>
                    {formatMetric(metrics.macro_avg['f1-score'])}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-medium text-white">Confusion Matrix</h4>
              <div className="grid grid-cols-2 gap-6">
                {metrics.confusion_matrix.map((row, i) => 
                  row.map((value, j) => (
                    <div 
                      key={`${i}-${j}`}
                      className="bg-gray-800/50 p-6 rounded-lg text-center"
                    >
                      <p className="text-gray-400 mb-2 text-sm">
                        {i === 0 ? (j === 0 ? 'True Negative' : 'False Positive') : 
                         (j === 0 ? 'False Negative' : 'True Positive')}
                      </p>
                      <p className="text-2xl font-bold text-white">{value}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 