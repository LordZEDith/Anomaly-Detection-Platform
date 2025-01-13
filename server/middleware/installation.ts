import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const checkInstallation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const configPath = join(__dirname, '../../.env.encrypted');
    await fs.access(configPath);
    next();
  } catch (error) {
    res.status(400).json({ error: 'System not installed' });
  }
}; 