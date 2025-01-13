import express, { Request, Response, RequestHandler } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

interface PredictionRequest {
    strategy: string;
    symbol: string;  // Primary symbol to chart
    base_features: { [key: string]: string };  // Base features needed for prediction
    interval: string;
    model: string;
}

interface PredictionResponse {
    predictions: any;
    features: any;
    news?: any[];
}

interface AIResponse {
  message: string;
  error?: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const predictHandler: RequestHandler = async (req: Request<{}, any, PredictionRequest>, res: Response): Promise<void> => {
    try {
        const { strategy, symbol, base_features, interval, model } = req.body;
        console.log('Received prediction request:', { strategy, symbol, base_features, interval, model });

        if (!strategy || !symbol || !base_features || !interval || !model) {
            res.status(400).json({ error: 'Missing required parameters' });
            return;
        }

        const scriptPath = path.join(__dirname, '../../anomaly_models/run_prediction.py');
        const venvPythonPath = path.join(__dirname, '../../anomaly_models/.venv/Scripts/python.exe');
        
        console.log('Python script path:', scriptPath);
        console.log('Virtual env Python path:', venvPythonPath);
        
        const symbol_mapping = {
            ...base_features,
            PRIMARY_SYMBOL: symbol
        };
        
        const symbolMappingJson = JSON.stringify(symbol_mapping).replace(/"/g, '\\"');
        
        const pythonProcess = spawn('"' + venvPythonPath + '"', [
            '-u', 
            '"' + scriptPath + '"',
            '--strategy', strategy.toString(),
            '--symbol-mapping', `"${symbolMappingJson}"`,
            '--interval', interval,
            '--model', model,
            '--primary-symbol', symbol 
        ], {
            cwd: path.join(__dirname, '../../anomaly_models'),
            shell: true,
            windowsVerbatimArguments: true
        });

        let result = '';
        let error = '';

        pythonProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('Python stdout:', output);
            result += output;
        });

        pythonProcess.stderr.on('data', (data) => {
            const errorOutput = data.toString();
            console.error('Python stderr:', errorOutput);
            error += errorOutput;
        });

        pythonProcess.on('close', (code) => {
            console.log('Python process exited with code:', code);
            if (code !== 0) {
                console.error('Python process error:', error);
                try {
                    if (error.includes('no price data found')) {
                        res.status(400).json({ 
                            error: error || 'Wrong Symbol',
                            details: {
                            exitCode: code,
                            stderr: error
                        }
                    });
                        return;
                    }
                    else {
                        res.status(500).json({ 
                            error: error || 'An error occurred during prediction',
                            details: {
                            exitCode: code,
                            stderr: error
                        }
                    });
                    return;
                    }
                } catch {
                    res.status(500).json({ 
                        error: error || 'An error occurred during prediction',
                        details: {
                            exitCode: code,
                            stderr: error
                        }
                    });
                    return;
                }
            }

            try {
                const lastLine = result.trim().split('\n').pop() || '';
                const predictions = JSON.parse(lastLine);
                
                if (!predictions.marketStats) {
                    console.warn('Market stats missing from Python response');
                }
                
                res.json(predictions);
            } catch (e) {
                console.error('Failed to parse prediction results:', e);
                res.status(500).json({ 
                    error: 'Failed to parse prediction results',
                    details: {
                        parseError: e instanceof Error ? e.message : String(e),
                        rawResult: result
                    }
                });
            }
        });

    } catch (error) {
        console.error('Error in anomaly prediction:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : String(error)
        });
    }
};

const supportedSymbolsHandler: RequestHandler = async (_req: Request, res: Response): Promise<void> => {
    try {
        const symbolsPath = path.join(__dirname, '../../src/data/supported_symbols.json');
        const data = await fs.readFile(symbolsPath, 'utf-8');
        const symbols = JSON.parse(data);
        res.json(symbols);
    } catch (error) {
        console.error('Error reading supported symbols:', error);
        res.status(500).json({ error: 'Failed to read supported symbols' });
    }
};

router.post('/predict', predictHandler);
router.get('/supported-symbols', supportedSymbolsHandler);

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { 
      messages, 
      marketData, 
      newsData, 
      strategyName,
      strategyPurpose,
      baseFeatures,
      derivedFeatures 
    } = req.body;

    const scriptPath = path.join(__dirname, '../../anomaly_models/ai_chat.py');
    const pythonPath = process.platform === 'win32' 
      ? path.join(__dirname, '../../anomaly_models/.venv/Scripts/python.exe')
      : path.join(__dirname, '../../anomaly_models/.venv/bin/python');
    
    const args = [
      '--messages', JSON.stringify(messages),
      '--market_data', JSON.stringify(marketData),
      '--news_data', JSON.stringify(newsData),
      '--strategy_name', strategyName || '',
      '--strategy_purpose', strategyPurpose || '',
      '--base_features', JSON.stringify(baseFeatures || {}),
      '--derived_features', JSON.stringify(derivedFeatures || [])
    ];

    const result = await new Promise((resolve, reject) => {
      const pythonProcess = spawn(pythonPath, [scriptPath, ...args]);
      let dataString = '';
      let errorString = '';

      pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorString += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(errorString || 'Failed to get AI response'));
        } else {
          try {
            resolve(JSON.parse(dataString));
          } catch (e) {
            reject(new Error('Invalid JSON response from Python script'));
          }
        }
      });
    });

    res.json(result);
  } catch (error) {
    console.error('Error in AI chat:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/chat/continue', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;

    const scriptPath = path.join(__dirname, '../../anomaly_models/ai_chat.py');
    const pythonPath = process.platform === 'win32' 
      ? path.join(__dirname, '../../anomaly_models/.venv/Scripts/python.exe')
      : path.join(__dirname, '../../anomaly_models/.venv/bin/python');
    
    const args = [
      '--messages', JSON.stringify(messages),
      '--continue_chat', 'true' // Flag to indicate this is a continuation
    ];

    const result = await new Promise((resolve, reject) => {
      const pythonProcess = spawn(pythonPath, [scriptPath, ...args]);
      let dataString = '';
      let errorString = '';

      pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorString += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(errorString || 'Failed to get AI response'));
        } else {
          try {
            resolve(JSON.parse(dataString));
          } catch (e) {
            reject(new Error('Invalid JSON response from Python script'));
          }
        }
      });
    });

    res.json(result);
  } catch (error) {
    console.error('Error in AI chat continuation:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 