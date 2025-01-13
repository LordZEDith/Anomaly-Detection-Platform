import express, { Request, Response, Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getConnection } from '../config/database';
import fs from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { RowDataPacket } from 'mysql2';

interface LoginRequest {
  email: string;
  password: string;
}

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string;
  role: string;
}

interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    role: string;
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

async function getJwtSecret(): Promise<string> {
  try {
    const configPath = join(__dirname, '../../.env.encrypted');
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    return config.jwtSecret;
  } catch (error) {
    console.error('Error reading JWT secret:', error);
    return 'your-secret-key';
  }
}

type LoginHandler = (
  req: Request<{}, LoginResponse | { error: string }, LoginRequest>,
  res: Response<LoginResponse | { error: string }>
) => Promise<void>;

const loginHandler: LoginHandler = async (req, res) => {
  try {
    const { email, password } = req.body;
    const connection = await getConnection();
    
    const [users] = await connection.query<UserRow[]>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    const user = users[0];
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const jwtSecret = await getJwtSecret();
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: '24h' }
    );

    const response: LoginResponse = {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };

    res.json(response);
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
};

router.post('/login', loginHandler);

export default router; 