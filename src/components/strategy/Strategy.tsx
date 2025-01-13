import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { cn } from '../../lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import supportedSymbols from '../../data/supported_symbols.json';

interface Feature {
  base: string[];
  derived: string[];
}

interface Strategy {
  id: number;
  name: string;
  folder: string;
  purpose: string[];
  features: Feature;
  advantages: string[];
  disadvantages: string[];
}

interface StrategyResponse {
  strategies: Strategy[];
}

export const Strategy: React.FC = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStrategy, setExpandedStrategy] = useState<number | null>(null);

  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        const response = await fetch('/anomaly_models/prepared_data/strategies.json');
        if (!response.ok) {
          throw new Error('Failed to fetch strategies');
        }
        const data: StrategyResponse = await response.json();
        setStrategies(data.strategies || []);
      } catch (err) {
        setError('Failed to load strategies');
        console.error('Error loading strategies:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStrategies();
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedStrategy(expandedStrategy === id ? null : id);
  };

  const allCategories = Object.values(supportedSymbols.supported_symbols)
    .filter(category => typeof category === 'object' && !Array.isArray(category))
    .reduce((acc: string[], category) => {
      if (typeof category === 'object' && !Array.isArray(category)) {
        return [...acc, ...Object.keys(category)];
      }
      return acc;
    }, []);

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

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-600 text-red-400 px-4 py-3 rounded relative" role="alert">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full text-gray-100 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">
          Anomaly Detection Strategies
        </h1>
        <p className="text-gray-400 mt-3 text-lg">
          Select and explore different anomaly detection approaches
        </p>
        <Separator className="my-6 bg-gray-800/50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 auto-rows-[280px]">
        {strategies.map((strategy) => {
          const useable = isStrategyUseable(strategy);
          return (
            <Card 
              key={strategy.id} 
              className={cn(
                "bg-[#171A25] border border-gray-800/50 shadow-xl text-gray-100 transition-all duration-300 flex flex-col",
                expandedStrategy === strategy.id 
                  ? "row-span-2 ring-2 ring-blue-500/50 shadow-blue-500/10" 
                  : "hover:ring-1 hover:ring-blue-400/30 hover:shadow-2xl hover:shadow-blue-500/5"
              )}
            >
              <CardHeader 
                className="flex flex-row items-center justify-between space-y-0 pb-4 cursor-pointer group"
                onClick={() => toggleExpand(strategy.id)}
              >
                <div className="flex flex-row items-center space-x-3">
                  <CardTitle className="text-xl font-semibold tracking-tight">
                    Strategy {strategy.id}: {strategy.name}
                  </CardTitle>
                  <div className={cn(
                    "text-xs font-medium px-2 py-1 rounded-full",
                    useable 
                      ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30"
                      : "bg-red-500/10 text-red-400 ring-1 ring-red-500/30"
                  )}>
                    {useable ? "Useable" : "Unuseable"}
                  </div>
                </div>
                <button className="text-blue-400/70 group-hover:text-blue-400 transition-colors">
                  {expandedStrategy === strategy.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </CardHeader>
              <CardContent 
                className={cn(
                  "space-y-4 transition-all duration-300",
                  expandedStrategy === strategy.id 
                    ? "opacity-100 overflow-y-auto scrollbar-thin scrollbar-track-gray-900/20 scrollbar-thumb-gray-700/50" 
                    : "opacity-80"
                )}
              >
                {expandedStrategy === strategy.id ? (
                  // Expanded view
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-blue-400 font-semibold mb-3">Purpose:</h3>
                      <ul className="space-y-2">
                        {strategy.purpose.map((item, index) => (
                          <li key={index} className="flex items-start text-gray-300">
                            <span className="text-blue-500/70 mr-2">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-blue-400 font-semibold mb-3">Features:</h3>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-gray-300 font-medium mb-2">Base Features:</h4>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {strategy.features.base.map((feature, index) => (
                              <div key={index} className={cn(
                                "flex items-start",
                                allCategories.includes(feature) ? "text-gray-100" : "text-gray-500"
                              )}>
                                <span className={cn(
                                  "mr-2",
                                  allCategories.includes(feature) ? "text-gray-100" : "text-gray-500"
                                )}>•</span>
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-gray-300 font-medium mb-2">Derived Features:</h4>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {strategy.features.derived.map((feature, index) => (
                              <div key={index} className="flex items-start text-gray-300">
                                <span className="text-blue-500/70 mr-2">•</span>
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-emerald-400 font-semibold mb-3">Advantages:</h3>
                        <ul className="space-y-2">
                          {strategy.advantages.map((advantage, index) => (
                            <li key={index} className="flex items-start text-gray-300">
                              <span className="text-emerald-500/70 mr-2">•</span>
                              <span>{advantage}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-rose-400 font-semibold mb-3">Disadvantages:</h3>
                        <ul className="space-y-2">
                          {strategy.disadvantages.map((disadvantage, index) => (
                            <li key={index} className="flex items-start text-gray-300">
                              <span className="text-rose-500/70 mr-2">•</span>
                              <span>{disadvantage}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Collapsed view
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-blue-400 font-semibold mb-2">Purpose:</h3>
                      <ul className="space-y-2">
                        {strategy.purpose.slice(0, 2).map((item, index) => (
                          <li key={index} className="flex items-start text-gray-300">
                            <span className="text-blue-500/70 mr-2">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                        {strategy.purpose.length > 2 && (
                          <li className="text-gray-500 italic">+ {strategy.purpose.length - 2} more...</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-blue-400 font-semibold mb-2">Features:</h3>
                      <p className="text-gray-300">
                        {strategy.features.base.length} base features, {strategy.features.derived.length} derived features
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}; 