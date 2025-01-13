import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Request, Response, NextFunction } from 'express';

interface JwtPayload {
  id: number;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function getJwtSecret(): Promise<string> {
  try {
    const configPath = join(__dirname, '../../.env.encrypted');
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    return config.jwtSecret;
  } catch (error) {
    console.error('Error reading JWT secret:', error);
    throw error;
  }
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const jwtSecret = await getJwtSecret();
    const user = jwt.verify(token, jwtSecret) as JwtPayload;
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Response | void {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
} 