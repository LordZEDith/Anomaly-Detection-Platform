import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

interface Strategy {
  id: string;
  name: string;
  purpose: string[];
  features: string[];
  advantages: string[];
  disadvantages: string[];
}

async function parseDescriptionFile(filePath: string): Promise<Strategy | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').map(line => line.trim());
    
    const strategy: Partial<Strategy> = {
      id: path.basename(path.dirname(filePath)),
      name: '',
      purpose: [],
      features: [],
      advantages: [],
      disadvantages: []
    };

    let currentSection: keyof Strategy | null = null;

    for (const line of lines) {
      if (line.startsWith('Strategy') || line.includes(':')) {
        const name = line.replace('Strategy', '').split(':')[0].trim();
        strategy.name = name;
      } else if (line === 'Purpose:') {
        currentSection = 'purpose';
      } else if (line === 'Features:') {
        currentSection = 'features';
      } else if (line === 'Advantages:') {
        currentSection = 'advantages';
      } else if (line === 'Disadvantages:') {
        currentSection = 'disadvantages';
      } else if (line.startsWith('-') && currentSection) {
        const item = line.substring(1).trim();
        if (strategy[currentSection]) {
          (strategy[currentSection] as string[]).push(item);
        }
      }
    }

    return strategy as Strategy;
  } catch (error) {
    console.error(`Error parsing description file ${filePath}:`, error);
    return null;
  }
}

router.get('/', async (req, res) => {
  try {
    const preparedDataPath = path.join(__dirname, '../../anomaly_models/prepared_data');
    const directories = await fs.readdir(preparedDataPath);
    
    const strategies: Strategy[] = [];
    
    for (const dir of directories) {
      const descriptionPath = path.join(preparedDataPath, dir, 'description.txt');
      try {
        const strategy = await parseDescriptionFile(descriptionPath);
        if (strategy) {
          strategies.push(strategy);
        }
      } catch (error) {
        console.error(`Error reading description for ${dir}:`, error);
      }
    }
    
    res.json({ strategies });
  } catch (error) {
    console.error('Error fetching strategies:', error);
    res.status(500).json({ error: 'Failed to fetch strategies' });
  }
});

export default router; 