import { useEffect, useRef, useState } from 'react';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import { 
  createChart, 
  ColorType, 
  IChartApi, 
  ISeriesApi, 
  SeriesMarker,
  Time,
  UTCTimestamp,
  HistogramData,
  CandlestickData
} from 'lightweight-charts';

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

interface StockChartProps {
  data: ChartData[];
  anomalyThreshold: number;
  symbol?: string;
  symbolName?: string;
  marketStats?: {
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
  anomalyMode: {
    type: 'prediction' | 'probability';
    inverted: boolean;
  };
  predictions: number[];
  probabilities: number[][];
}

export const StockChart = ({ 
  data, 
  anomalyThreshold, 
  symbol = '', 
  symbolName = '',
  marketStats,
  anomalyMode,
  predictions,
  probabilities
}: StockChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // Get the latest close price from the data
  const latestClose = data[data.length - 1]?.close;
  
  // Use latest close when currentPrice is 0 or undefined
  const displayPrice = (marketStats?.currentPrice === 0 || !marketStats?.currentPrice) 
    ? latestClose 
    : marketStats?.currentPrice;
      
  const previousClose = marketStats?.previousClose;
  const priceChange = previousClose ? (latestClose - previousClose) : 0;
  const percentChange = previousClose ? ((latestClose - previousClose) / previousClose * 100) : 0;
  const isPositive = priceChange > 0;

  // Format current time
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const dateString = now.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
  
  // Get timezone abbreviation
  const timezone = now.toLocaleTimeString('en-US', {
    timeZoneName: 'short'
  }).split(' ')[2];

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'rgb(17, 24, 39)' }, // Dark background
        textColor: '#A0AEC0',
      },
      grid: {
        vertLines: { color: '#2D3748' },
        horzLines: { color: '#2D3748' },
      },
      rightPriceScale: {
        borderColor: '#2D3748',
      },
      timeScale: {
        borderColor: '#2D3748',
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          const month = date.toLocaleString('default', { month: 'short' });
          const day = date.getDate();
          return `${month} ${day}`;
        },
        fixLeftEdge: true,
        fixRightEdge: true,
        borderVisible: false,
        ticksVisible: true,
      },
      crosshair: {
        mode: 0,
        vertLine: {
          color: '#4A5568',
          labelBackgroundColor: '#2D3748',
        },
        horzLine: {
          color: '#4A5568',
          labelBackgroundColor: '#2D3748',
        },
      },
    });

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10B981',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    // Create volume series
    const volumeSeries = chart.addHistogramSeries({
      color: '#4A5568',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Set to empty string to create a new scale
    });

    // Format data for the chart
    const chartData: CandlestickData<UTCTimestamp>[] = data.map(d => ({
      time: (new Date(d.timestamp).getTime() / 1000) as UTCTimestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    const volumeData: HistogramData<UTCTimestamp>[] = data.map(d => ({
      time: (new Date(d.timestamp).getTime() / 1000) as UTCTimestamp,
      value: d.volume,
      color: d.close >= d.open ? '#10B98133' : '#EF444433',
    }));

    // Create markers for anomalies based on mode
    const markers: SeriesMarker<UTCTimestamp>[] = data
      .map((d, index) => {
        let isAnomaly = false;
        let probability = 0;

        if (anomalyMode.type === 'prediction') {
          if (anomalyMode.inverted) {
            // When inverted, flip the prediction values (0 becomes 1, 1 becomes 0)
            isAnomaly = predictions[index] === 0 || predictions[index] === -1;
            probability = probabilities[index][0];
          } else {
            // Normal mode - mark actual anomalies (prediction === 1)
            isAnomaly = predictions[index] === 1;
            probability = probabilities[index][1];
          }
        } else {
          if (anomalyMode.inverted) {
            // When inverted, mark points with high normal probability
            probability = probabilities[index][0];
            isAnomaly = probability >= anomalyThreshold;
          } else {
            // Normal mode - mark points with high anomaly probability
            probability = probabilities[index][1];
            isAnomaly = probability >= anomalyThreshold;
          }
        }

        if (!isAnomaly) return undefined;

        return {
          time: (new Date(d.timestamp).getTime() / 1000) as UTCTimestamp,
          position: 'aboveBar',
          color: '#F56565',
          shape: 'arrowDown',
          text: anomalyMode.inverted ? 'Anomaly' : `Anomaly (${(probability * 100).toFixed(1)}%)`,
        } as SeriesMarker<UTCTimestamp>;
      })
      .filter((marker): marker is SeriesMarker<UTCTimestamp> => marker !== undefined);

    // Set the data
    candlestickSeries.setData(chartData);
    volumeSeries.setData(volumeData);
    candlestickSeries.setMarkers(markers);

    // Fit content
    chart.timeScale().fitContent();

    // Store refs
    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    // Cleanup
    return () => {
      chart.remove();
    };
  }, [data, anomalyThreshold, anomalyMode, predictions, probabilities]);

  return (
    <div className="bg-[#1a1f2c] border border-gray-800 rounded-lg p-6">
      <div className="flex flex-col">
        {/* Price Header */}
        <div className="space-y-1 mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {marketStats?.shortName}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-4xl font-bold text-white">
              {displayPrice?.toFixed(2)}
            </span>
            <span className="text-sm text-gray-400">{marketStats?.currency}</span>
            <div className={`flex items-center ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
              <span className="font-medium ml-1 flex items-center gap-1">
                {isPositive ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />}
                {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({percentChange.toFixed(2)}%) at close
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-400">
            {dateString} at {timeString} {timezone} · Market {marketStats?.marketState?.toLowerCase()?.replace(/^./, str => str.toUpperCase())}
          </p>
        </div>

        {/* Chart */}
        <div 
          ref={chartContainerRef} 
          className="w-full h-full min-h-[500px]"
        />
      </div>
    </div>
  );
}; 