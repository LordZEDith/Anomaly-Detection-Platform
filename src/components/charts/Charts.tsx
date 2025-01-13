import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { predictAnomalies } from '../../api/api';
import { StockChart } from './StockChart';
import { NewsPanel } from "./NewsPanel";
import { AIChat } from "./AIChat";

interface Strategy {
  id: string;
  name: string;
  purpose: string[];
  features: {
    base: string[];
    derived?: string[];
  };
  advantages: string[];
  disadvantages: string[];
}

interface SymbolInfo {
  symbol: string;
  description: string;
}

interface SymbolCategory {
  [key: string]: SymbolInfo;
}

interface SupportedSymbols {
  supported_symbols: {
    [key: string]: SymbolCategory;
  };
}


import supportedSymbols from '../../data/supported_symbols.json';
const typedSymbols = supportedSymbols as SupportedSymbols;

interface ChartData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isAnomaly: boolean;
  anomalyProbability: number;
}

interface PredictionResponse {
  timestamps: string[];
  predictions: number[];
  probabilities: number[][];
  ohlc: {
    open: number[];
    high: number[];
    low: number[];
    close: number[];
    volume: number[];
  };
  marketStats?: {
    marketCap?: number | null;
    peRatio?: number | null;
    divYield?: number | null;
    week52High?: number;
    week52Low?: number;
    longName?: string;
    shortName?: string;
    currency?: string;
    marketState?: string;
    marketTime?: string;
    priceChange?: number;
    priceChangePercent?: number;
    currentPrice?: number;
    previousClose?: number;
  };
  news?: {
    uuid: string;
    title: string;
    publisher: string;
    link: string;
    providerPublishTime: number;
    thumbnail?: {
      resolutions: {
        url: string;
        width: number;
        height: number;
        tag: string;
      }[];
    };
  }[];
}

const INTERVALS = [
  { value: '1mo', label: '1 Month' },
  { value: '3mo', label: '3 Months' },
  { value: '6mo', label: '6 Months' },
  { value: '1y', label: '1 Year' },
  { value: '2y', label: '2 Years' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'max', label: 'Maximum' }
];

const isStrategyUsable = (strategy: Strategy): boolean => {
  if (!typedSymbols?.supported_symbols || !strategy?.features) {
    return false;
  }

  const allCategories = Object.values(typedSymbols.supported_symbols)
    .filter(category => typeof category === 'object' && category !== null && !Array.isArray(category));
  
  const availableSymbols = new Set(
    allCategories.flatMap(category => 
      Object.keys(category)
    )
  );

  const baseFeatures = strategy.features.base;

  return baseFeatures.length > 0 && baseFeatures.every(feature => availableSymbols.has(feature));
};

interface MarketStats {
  marketCap?: number;
  peRatio?: number;
  divYield?: number;
  week52High?: number;
  week52Low?: number;
  longName?: string;
  shortName?: string;
  currency?: string;
  marketState?: string;
  marketTime?: string;
  priceChange?: number;
  priceChangePercent?: number;
  currentPrice?: number;
  previousClose?: number;
}

interface AnomalyMode {
  type: 'prediction' | 'probability';
  inverted: boolean;
}

export const Charts = () => {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [selectedInterval, setSelectedInterval] = useState('5d');
  const [searchSymbol, setSearchSymbol] = useState('');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [anomalyThreshold, setAnomalyThreshold] = useState(0.7); // Default threshold of 70%
  const [apiResponse, setApiResponse] = useState<PredictionResponse | null>(null);
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null);
  const [anomalyMode, setAnomalyMode] = useState<AnomalyMode>({
    type: 'prediction',
    inverted: false
  });
  const [analysisSuccess, setAnalysisSuccess] = useState(false);

  const currentStrategy = strategies.find(s => s.id === selectedStrategy);

  const baseFeatureMapping = currentStrategy?.features?.base.reduce((acc, feature) => {
    for (const category of Object.values(typedSymbols.supported_symbols)) {
      if (feature in category) {
        acc[feature] = category[feature].description;
        break;
      }
    }
    return acc;
  }, {} as { [key: string]: string }) || {};

  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        const response = await fetch('/anomaly_models/prepared_data/strategies.json');
        if (!response.ok) {
          throw new Error('Failed to fetch strategies');
        }
        const data = await response.json();
        setStrategies(data.strategies || []);
      } catch (err) {
        setError('Failed to load strategies');
        console.error('Error loading strategies:', err);
      }
    };

    fetchStrategies();
  }, []);

  useEffect(() => {
    setSelectedModel('');
  }, [selectedStrategy]);

  const sortedStrategies = [...strategies].sort((a, b) => parseInt(a.id) - parseInt(b.id));

  const fetchPredictions = async () => {
    if (!selectedStrategy || !searchSymbol || !selectedInterval || !selectedModel) {
      setError('Please select all required fields');
      return;
    }

    setAnalysisSuccess(false);
    setLoading(true);
    setError(null);
    setChartData([]);
    setApiResponse(null);
    setMarketStats(null);

    try {
      const strategy = strategies.find(s => s.id === selectedStrategy);
      if (!strategy) {
        throw new Error('Selected strategy not found');
      }

      const base_features: { [key: string]: string } = {};
      strategy.features.base.forEach(feature => {
        base_features[feature] = feature;
      });

      const response = await predictAnomalies({
        strategy: selectedStrategy,
        symbol: searchSymbol,
        base_features,
        interval: selectedInterval,
        model: selectedModel || 'voting_ensemble'
      });

      setApiResponse(response);

      const transformedData: ChartData[] = response.timestamps.map((timestamp: string, i: number) => ({
        timestamp,
        open: response.ohlc.open[i],
        high: response.ohlc.high[i],
        low: response.ohlc.low[i],
        close: response.ohlc.close[i],
        volume: response.ohlc.volume[i],
        isAnomaly: response.predictions[i] === 1,
        anomalyProbability: response.probabilities[i][1]
      }));

      setChartData(transformedData);
      if (response.marketStats) {
        setMarketStats({
          ...response.marketStats,
          symbol: searchSymbol
        });
      }
      
      setAnalysisSuccess(true);
    } catch (err) {
      if (!(err instanceof Error && err.message.includes("No data returned for symbol"))) {
        console.error('Error fetching predictions:', err);
      }
      
      let errorMessage = err instanceof Error ? err.message : 'Failed to fetch predictions';
      
      const cleanErrorMessage = (msg: string): string => {
        try {
          if (msg.includes('{"error":')) {
            const jsonStr = msg.substring(msg.indexOf('{"error":'));
            const jsonError = JSON.parse(jsonStr);
            return jsonError.error;
          }
          const colonIndex = msg.lastIndexOf(':');
          if (colonIndex !== -1) {
            msg = msg.substring(colonIndex + 1).trim();
          }
          return msg;
        } catch {
          return msg;
        }
      };
      
      setError(cleanErrorMessage(errorMessage));
      setAnalysisSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#151821] text-gray-100 p-8 overflow-y-auto scrollbar-thin scrollbar-track-gray-900/20 scrollbar-thumb-gray-700/50">
      <div className="flex flex-col space-y-4 mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">
            Market Analysis
        </h1>
        
        {/* Controls */}
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="symbol" className="text-sm font-medium text-gray-200">Ticker Symbol</label>
            <Input
              id="symbol"
              type="text"
              placeholder="Enter ticker symbol (e.g., AA)"
              value={searchSymbol}
              onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
              className="w-[200px] bg-gray-900/50 border-gray-700 text-gray-100 placeholder:text-gray-500 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="strategy" className="text-sm font-medium text-gray-400">Strategy</label>
            <Select
              value={selectedStrategy}
              onValueChange={setSelectedStrategy}
            >
              <SelectTrigger id="strategy" className="w-[300px] bg-[#1a1f2c] border-gray-800 text-gray-300 focus:ring-blue-500/20 focus:border-blue-500/40">
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1f2c] border-gray-800">
                {sortedStrategies.map((strategy) => {
                  const usable = isStrategyUsable(strategy);
                  return (
                    <SelectItem 
                      key={strategy.id} 
                      value={strategy.id}
                      disabled={!usable}
                      className={`
                        ${!usable ? 'opacity-50 cursor-not-allowed text-gray-500' : 'text-gray-300'} 
                        hover:bg-gray-800/50 focus:bg-gray-800/50
                      `}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={!usable ? 'text-gray-500' : 'text-gray-300'}>
                          Strategy {strategy.id}: {strategy.name}
                        </span>
                        <Badge 
                          variant={usable ? "success" : "destructive"} 
                          className={`ml-2 ${usable ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                        >
                          {usable ? "Usable" : "Unusable"}
                        </Badge>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="model" className="text-sm font-medium text-gray-400">Model</label>
            <Select
              value={selectedModel}
              onValueChange={setSelectedModel}
              disabled={!selectedStrategy}
            >
              <SelectTrigger id="model" className="w-[200px] bg-[#1a1f2c] border-gray-800 text-gray-300 focus:ring-blue-500/20 focus:border-blue-500/40">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1f2c] border-gray-800 rounded-md [&>*]:text-gray-300 [&_[role=option]]:text-gray-300 [&_[role=option]_svg]:text-gray-300 [&_[role=option]:hover_svg]:text-gray-300">
                <SelectItem value="voting_ensemble" className="text-gray-300 data-[highlighted]:text-gray-300 hover:bg-gray-800/50 focus:bg-gray-800/50 cursor-pointer data-[state=checked]:text-gray-300">
                  Voting Ensemble
                </SelectItem>
                <SelectItem value="isolation_forest" className="text-gray-300 data-[highlighted]:text-gray-300 hover:bg-gray-800/50 focus:bg-gray-800/50 cursor-pointer data-[state=checked]:text-gray-300">
                  Isolation Forest
                </SelectItem>
                <SelectItem value="xgboost" className="text-gray-300 data-[highlighted]:text-gray-300 hover:bg-gray-800/50 focus:bg-gray-800/50 cursor-pointer data-[state=checked]:text-gray-300">
                  XGBoost
                </SelectItem>
                <SelectItem value="gradient_boosting" className="text-gray-300 data-[highlighted]:text-gray-300 hover:bg-gray-800/50 focus:bg-gray-800/50 cursor-pointer data-[state=checked]:text-gray-300">
                  Gradient Boosting
                </SelectItem>
                <SelectItem value="random_forest" className="text-gray-300 data-[highlighted]:text-gray-300 hover:bg-gray-800/50 focus:bg-gray-800/50 cursor-pointer data-[state=checked]:text-gray-300">
                  Random Forest
                </SelectItem>
                <SelectItem value="neural_net" className="text-gray-300 data-[highlighted]:text-gray-300 hover:bg-gray-800/50 focus:bg-gray-800/50 cursor-pointer data-[state=checked]:text-gray-300">
                  Neural Network
                </SelectItem>
                <SelectItem value="svm" className="text-gray-300 data-[highlighted]:text-gray-300 hover:bg-gray-800/50 focus:bg-gray-800/50 cursor-pointer data-[state=checked]:text-gray-300">
                  Support Vector Machine
                </SelectItem>
                <SelectItem value="gaussian_mixture" className="text-gray-300 data-[highlighted]:text-gray-300 hover:bg-gray-800/50 focus:bg-gray-800/50 cursor-pointer data-[state=checked]:text-gray-300">
                  Gaussian Mixture
                </SelectItem>
                <SelectItem value="elliptic_envelope" className="text-gray-300 data-[highlighted]:text-gray-300 hover:bg-gray-800/50 focus:bg-gray-800/50 cursor-pointer data-[state=checked]:text-gray-300">
                  Elliptic Envelope
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="interval" className="text-sm font-medium text-gray-400">Time Period</label>
            <Select
              value={selectedInterval}
              onValueChange={setSelectedInterval}
            >
              <SelectTrigger id="interval" className="w-[200px] bg-[#1a1f2c] border-gray-800 text-gray-300 focus:ring-blue-500/20 focus:border-blue-500/40">
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1f2c] border-gray-800 rounded-md [&>*]:text-gray-300 [&_[role=option]]:text-gray-300 [&_[role=option]_svg]:text-gray-300 [&_[role=option]:hover_svg]:text-gray-300">
                {INTERVALS.map((interval) => (
                  <SelectItem 
                    key={interval.value} 
                    value={interval.value} 
                    className="text-gray-300 data-[highlighted]:text-gray-300 hover:bg-gray-800/50 focus:bg-gray-800/50 cursor-pointer data-[state=checked]:text-gray-300 [&_svg]:text-gray-300"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-gray-300">{interval.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={fetchPredictions}
              disabled={!selectedStrategy || !selectedModel || !searchSymbol || loading}
              className="h-10 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Analyze'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="text-red-400 bg-red-400/10 p-3 rounded-md">
            {error}
          </div>
        )}

        {currentStrategy && (
          <div className="text-sm text-gray-400">
            <p>Required features: {currentStrategy.features.base.join(', ')}</p>
          </div>
        )}
      </div>

      {/* Chart and Stats */}
      {chartData.length > 0 && (
        <>
          <div className="flex-1 min-h-[500px] bg-gray-900/50 p-6 rounded-lg">
            {/* Strategy Details */}
            {currentStrategy && (
              <div className="mb-6 p-4 bg-[#1a1f2c] border border-gray-800 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Strategy {currentStrategy.id}: {currentStrategy.name}</h2>
                <div className="space-y-3">
                  <div>
                    <h3 className="text-gray-400">Purpose:</h3>
                    <p className="text-gray-200">{currentStrategy.purpose.join(', ')}</p>
                  </div>
                  <div>
                    <h3 className="text-gray-400">Base Features:</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {currentStrategy.features.base.map((feature) => (
                        <Badge 
                          key={feature}
                          variant="secondary" 
                          className="bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        >
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {currentStrategy.features.derived && (
                    <div>
                      <h3 className="text-gray-400">Derived Features:</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {currentStrategy.features.derived.map((feature) => (
                          <Badge 
                            key={feature}
                            variant="secondary" 
                            className="bg-purple-500/20 text-purple-400 border border-purple-500/30"
                          >
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-6 mb-4 p-4 bg-[#1a1f2c] border border-gray-800 rounded-lg">
              <div className="flex items-center gap-4">
                <label className="text-gray-200">Anomaly Detection Mode:</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-gray-300">
                    <input
                      type="radio"
                      checked={anomalyMode.type === 'prediction'}
                      onChange={() => setAnomalyMode({ type: 'prediction', inverted: false })}
                      className="text-blue-500"
                    />
                    Prediction
                  </label>
                  <label className="flex items-center gap-2 text-gray-300">
                    <input
                      type="radio"
                      checked={anomalyMode.type === 'probability'}
                      onChange={() => setAnomalyMode({ type: 'probability', inverted: false })}
                      className="text-blue-500"
                    />
                    Probability
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={anomalyMode.inverted}
                    onChange={(e) => setAnomalyMode({ ...anomalyMode, inverted: e.target.checked })}
                    className="text-blue-500"
                  />
                  Inverted
                </label>
              </div>

              {anomalyMode.type === 'probability' && (
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-300">
                    Threshold: {(anomalyThreshold * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={anomalyThreshold}
                    onChange={(e) => setAnomalyThreshold(parseFloat(e.target.value))}
                    className="w-[150px] bg-[#1a1f2c] border-gray-800"
                  />
                </div>
              )}
            </div>

            <StockChart 
              data={chartData}
              anomalyThreshold={anomalyThreshold}
              symbol={searchSymbol}
              symbolName={searchSymbol === '^VIX' ? 'CBOE Market Volatility Index' : searchSymbol}
              marketStats={apiResponse?.marketStats}
              anomalyMode={anomalyMode}
              predictions={apiResponse?.predictions || []}
              probabilities={apiResponse?.probabilities || []}
            />

            {/* News Panel */}
            {apiResponse?.news && (
              <div className="mt-6">
                <h2 className="text-xl font-semibold mb-4">Latest News</h2>
                <NewsPanel news={apiResponse.news} />
              </div>
            )}
          </div>
        </>
      )}

      <AIChat 
        isVisible={analysisSuccess}
        marketData={marketStats}
        newsData={apiResponse?.news}
        strategyName={currentStrategy?.name}
        strategyPurpose={currentStrategy?.purpose.join(' ')}
        baseFeatures={baseFeatureMapping}
        derivedFeatures={currentStrategy?.features.derived}
      />
    </div>
  );
}; 