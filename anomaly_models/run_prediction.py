import os
import sys
import site
import json
import argparse
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
import joblib
import yfinance as yf

def escape_path(path):
    """Escape spaces in path for Windows."""
    return f'"{path}"' if ' ' in path else path

# Get the absolute path to the script's directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Valid intervals for yfinance
VALID_INTERVALS = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max']

# Special symbol mappings for Yahoo Finance
YAHOO_SYMBOL_MAP = {
    'VIX': '^VIX',
    'MXUS': 'MXUS.L',
    'MXEU': 'MXEU.SW',
    'MXJP': 'MXJP.L',
    'MXCN': '^MXCN',
    'XAU BGNL': 'GC=F',  # Gold Futures
    'Cl1': 'CL=F',  # Crude Oil Futures
    'USGG10YR': '^TNX',  # 10-Year Treasury Yield
    'DXY': 'DX-Y.NYB',  # US Dollar Index
    'BDIY': 'BDI.L'  # Baltic Dry Index
}

# Multiplier mapping for symbols that need scaling adjustment
MULTIPLIER_MAPPING = {
    'MXUS': 10,  # MSCI USA index needs 10x multiplier
    'MXJP': 10,  # MSCI Japan index needs 10x multiplier
}

# Strategy ID to folder name mapping
STRATEGY_FOLDERS = {
    "1": "all_features",
    "2": "vix_only",
    "3": "equities",
    "4": "commodities",
    "5": "equities_vs_commodities",
    "6": "equities_vs_bonds",
    "7": "volatility_vs_equities",
    "8": "equity_dispersion",
    "9": "commodity_dispersion",
    "10": "yield_curve_metrics",
    "11": "market_stress",
    "12": "global_market_stress",
    "13": "volatility_regime",
    "14": "cross_asset_momentum",
    "15": "yield_curve_enhanced",
    "16": "combined_stress",
    "17": "vix_momentum",
    "18": "yield_spread_momentum",
    "19": "dxy_gold_correlation",
    "20": "em_vs_dm",
    "21": "oil_dxy_relationship",
    "22": "us_eu_yield_spread",
    "23": "bond_market_stress",
    "24": "jpy_yield_correlation",
    "25": "equity_vix_ratio"
}

def load_model(strategy: str, model_name: str = 'voting_ensemble'):
    """Load the trained model for the given strategy."""
    strategy_folder = STRATEGY_FOLDERS.get(str(strategy))
    if not strategy_folder:
        raise ValueError(f"Invalid strategy ID: {strategy}")
    
    # Validate model name
    valid_models = [
        'voting_ensemble',
        'isolation_forest',
        'xgboost',
        'gradient_boosting',
        'random_forest',
        'neural_net',
        'svm',
        'gaussian_mixture',
        'elliptic_envelope'
    ]
    if model_name not in valid_models:
        raise ValueError(f"Invalid model name: {model_name}. Must be one of {valid_models}")
        
    model_path = escape_path(os.path.join(SCRIPT_DIR, 'results', strategy_folder, 'models', f'{model_name}.joblib'))
    if not os.path.exists(model_path.strip('"')):  # Remove quotes for path existence check
        raise FileNotFoundError(f"Model not found at path: {model_path}")
    return joblib.load(model_path.strip('"'))  # Remove quotes for joblib

def fetch_data(symbol_mapping: dict, interval: str) -> tuple[pd.DataFrame, dict]:
    """Fetch data for all required symbols using yfinance."""
    if interval not in VALID_INTERVALS:
        raise ValueError(f"Invalid interval: {interval}. Must be one of {VALID_INTERVALS}")

    all_data = {}
    all_data_weekly = {}
    market_stats = {}
    
    for feature, symbol in symbol_mapping.items():
        try:
            # Map the symbol to its Yahoo Finance equivalent if it exists
            yahoo_symbol = YAHOO_SYMBOL_MAP.get(symbol, symbol)
            print(f"Fetching data for symbol: {symbol} (Yahoo: {yahoo_symbol})")
            
            ticker = yf.Ticker(yahoo_symbol)
            
            # Get both daily and weekly data
            daily_data = ticker.history(period=interval, interval='1d')
            weekly_data = ticker.history(period=interval, interval='1wk')
            
            if daily_data.empty or weekly_data.empty:
                raise ValueError(f"No data returned for symbol ({symbol}). Please check if the symbol is correct.")
            
            # Ensure indexes are timezone-aware and in UTC
            for data in [daily_data, weekly_data]:
                if data.index.tz is None:
                    data.index = data.index.tz_localize('UTC')
                else:
                    data.index = data.index.tz_convert('UTC')
            
            # Apply multiplier if needed
            multiplier = MULTIPLIER_MAPPING.get(symbol, 1)
            if multiplier != 1:
                daily_data[['Open', 'High', 'Low', 'Close']] = (daily_data[['Open', 'High', 'Low', 'Close']] * multiplier).round(3)
                weekly_data[['Open', 'High', 'Low', 'Close']] = (weekly_data[['Open', 'High', 'Low', 'Close']] * multiplier).round(3)
            else:
                daily_data[['Open', 'High', 'Low', 'Close']] = daily_data[['Open', 'High', 'Low', 'Close']].round(3)
                weekly_data[['Open', 'High', 'Low', 'Close']] = weekly_data[['Open', 'High', 'Low', 'Close']].round(3)
            
            # Store OHLCV data for all symbols (both daily and weekly)
            # Daily data for display
            all_data[f"{feature}_Open"] = daily_data['Open']
            all_data[f"{feature}_High"] = daily_data['High']
            all_data[f"{feature}_Low"] = daily_data['Low']
            all_data[f"{feature}_Close"] = daily_data['Close']
            all_data[f"{feature}_Volume"] = daily_data['Volume']
            
            # Weekly data for model features
            all_data_weekly[f"{feature}_Open"] = weekly_data['Open']
            all_data_weekly[f"{feature}_High"] = weekly_data['High']
            all_data_weekly[f"{feature}_Low"] = weekly_data['Low']
            all_data_weekly[f"{feature}_Close"] = weekly_data['Close']
            all_data_weekly[f"{feature}_Volume"] = weekly_data['Volume']
            
            # Get market stats for the main symbol (usually the first one)
            if feature == list(symbol_mapping.keys())[0]:
                info = ticker.info
                
                # Get market status
                market_hours = info.get('regularMarketTime', '')
                try:
                    market_time = pd.Timestamp(market_hours, unit='s', tz='America/New_York')
                    market_time_str = market_time.strftime('%B %d, %I:%M %p EST')
                except:
                    market_time_str = ''
                
                # Get price changes
                current_price = daily_data['Close'].iloc[-1] if not daily_data.empty else info.get('regularMarketPrice', 0)
                previous_close = info.get('regularMarketPreviousClose', 0)
                price_change = current_price - previous_close
                price_change_percent = (price_change / previous_close * 100) if previous_close else 0
                
                market_stats = {
                    'marketCap': info.get('marketCap'),
                    'peRatio': info.get('trailingPE'),
                    'divYield': info.get('dividendYield'),
                    'week52High': info.get('fiftyTwoWeekHigh'),
                    'week52Low': info.get('fiftyTwoWeekLow'),
                    'longName': info.get('longName', symbol),
                    'shortName': info.get('shortName', symbol),
                    'currency': info.get('currency', 'USD'),
                    'marketState': info.get('marketState', 'CLOSED'),
                    'marketTime': market_time_str,
                    'priceChange': price_change,
                    'priceChangePercent': price_change_percent,
                    'currentPrice': current_price,
                    'previousClose': previous_close,
                }
                
            print(f"Successfully fetched {len(daily_data)} daily points and {len(weekly_data)} weekly points for {symbol}")
            
        except Exception as e:
            print(f"Error fetching data for {symbol} (Yahoo: {yahoo_symbol}): {str(e)}")
            raise

    df_daily = pd.DataFrame(all_data)
    df_weekly = pd.DataFrame(all_data_weekly)
    
    if df_daily.empty or df_weekly.empty:
        raise ValueError("No data available for the specified symbols")
        
    df_daily = df_daily.ffill().bfill()
    df_weekly = df_weekly.ffill().bfill()
    
    print(f"Final daily dataset shape: {df_daily.shape}")
    print(f"Final weekly dataset shape: {df_weekly.shape}")
    
    return df_daily, df_weekly, market_stats

def calculate_momentum_features(data: pd.DataFrame, periods=[7, 14, 21]) -> pd.DataFrame:
    """Calculate momentum and mean reversion features for given data."""
    features = pd.DataFrame(index=data.index)
    
    required_features = ['MXUS', 'XAU BGNL', 'DXY', 'Cl1', 'BDIY']
    
    for feature in required_features:
        if f"{feature}_Close" not in data.columns:
            raise ValueError(f"Required feature {feature} not found in data")
            
        prices = data[f"{feature}_Close"]
        
        features[feature] = prices.round(3)
        
        for period in periods:

            mom = (prices / prices.shift(period) - 1).round(3)
            features[f"{feature}_mom_{period}d"] = mom
            
            ma = prices.rolling(window=period).mean()
            mean_rev = ((prices - ma) / ma).round(3)
            features[f"{feature}_mean_rev_{period}d"] = mean_rev
    
    features = features.fillna(0)
    
    # Verify we have exactly 35 features
    expected_features = len(required_features) * (1 + 2 * len(periods))  # base features + (momentum + mean_rev) * periods
    if len(features.columns) != expected_features:
        raise ValueError(f"Generated {len(features.columns)} features, but model expects {expected_features}")
    
    return features

def get_symbol_news(symbol):
    ticker = yf.Search(symbol, news_count=10)
    return ticker.news

def main():
    try:
        parser = argparse.ArgumentParser(description='Run anomaly detection predictions')
        parser.add_argument('--strategy', required=True, help='Strategy ID to use')
        parser.add_argument('--symbol-mapping', required=True, type=json.loads, help='JSON mapping of features to symbols')
        parser.add_argument('--interval', required=True, help=f'Time interval for data. Must be one of {VALID_INTERVALS}')
        parser.add_argument('--model', default='voting_ensemble', help='Model to use for predictions')
        parser.add_argument('--primary-symbol', required=True, help='Primary symbol to chart predictions against')
        
        args = parser.parse_args()
        
        model = load_model(args.strategy, args.model)
        
        primary_data, primary_data_weekly, market_stats = fetch_data({'symbol': args.primary_symbol}, args.interval)
        
        base_features_mapping = {k: v for k, v in args.symbol_mapping.items() if k != 'PRIMARY_SYMBOL'}
        _, base_data_weekly, _ = fetch_data(base_features_mapping, args.interval)
        
        primary_data.index = primary_data.index.tz_convert('UTC').normalize()
        base_data_weekly.index = base_data_weekly.index.tz_convert('UTC').normalize()
        
        # Ensure timestamps match between primary and base data
        #common_dates = primary_data.index.intersection(base_data_weekly.index)
        #if len(common_dates) == 0:
        #    raise ValueError("No overlapping dates between primary symbol and base features")
            
        # Filter both datasets to only include common dates
        #primary_data = primary_data.loc[common_dates]
        #base_data_weekly = base_data_weekly.loc[common_dates]
        
        # For cross_asset_momentum strategy, calculate additional features
        if args.strategy == "14":  # cross_asset_momentum
            feature_data = calculate_momentum_features(base_data_weekly)
            #print("Cross-asset momentum features calculated:")
            #print(feature_data.columns.tolist())
            #print(f"Total features: {len(feature_data.columns)}")
        else:
            # For other strategies, just use Close prices
            feature_data = pd.DataFrame()
            for feature in base_features_mapping.keys():
                feature_data[feature] = base_data_weekly[f"{feature}_Close"].round(3)
        
        #print("Feature data before scaling:")
        #print(feature_data)
        
        # Scale the feature data
        scaler = StandardScaler()
        scaled_data = scaler.fit_transform(feature_data)
        
        #print("Feature data after scaling:")
        #print(pd.DataFrame(scaled_data, columns=feature_data.columns))
        
        # Make predictions
        predictions = model.predict(scaled_data)
        try:
            # Try to get probabilities - some models like isolation_forest don't have predict_proba
            probabilities = model.predict_proba(scaled_data)
        except (AttributeError, NotImplementedError):
            # If predict_proba is not available, create binary probabilities from predictions
            probabilities = np.zeros((len(predictions), 2))
            for i, pred in enumerate(predictions):
                probabilities[i] = [1 - pred, pred]  # [normal_prob, anomaly_prob]
        
        # Initialize arrays for daily data
        daily_predictions = np.zeros(len(primary_data))
        daily_probabilities = np.zeros((len(primary_data), 2))
        
        # Create a mapping between weekly and daily dates
        for i, weekly_date in enumerate(base_data_weekly.index):
            # Find the matching daily date
            matching_date = primary_data.index[primary_data.index == weekly_date]
            if len(matching_date) > 0:
                idx = primary_data.index.get_loc(matching_date[0])
                daily_predictions[idx] = predictions[i]
                daily_probabilities[idx] = probabilities[i]
        
        # Prepare the response with primary symbol's OHLC data
        result = {
            'timestamps': primary_data.index.strftime('%Y-%m-%d %H:%M:%S').tolist(),
            'predictions': daily_predictions.tolist(),
            'probabilities': daily_probabilities.tolist(),
            'ohlc': {
                'open': primary_data['symbol_Open'].tolist(),
                'high': primary_data['symbol_High'].tolist(),
                'low': primary_data['symbol_Low'].tolist(),
                'close': primary_data['symbol_Close'].tolist(),
                'volume': primary_data['symbol_Volume'].tolist()
            },
            'marketStats': market_stats,
            'news': get_symbol_news(args.primary_symbol)  # Add news data
        }
        
        print(json.dumps(result, separators=(',', ':'), allow_nan=False))
        
    except Exception as e:
        error_response = {
            'error': str(e),
            'type': type(e).__name__
        }
        print(json.dumps(error_response, separators=(',', ':')), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main() 