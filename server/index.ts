import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import installRoutes from './routes/install';
import authRoutes from './routes/auth';
import strategiesRoutes from './routes/strategies';
import anomalyRoutes from './routes/anomaly';
import { checkInstallation } from './middleware/installation';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/install', installRoutes);
app.use('/api/auth', authRoutes);

// Protected routes (require installation)
app.use('/api/strategies', checkInstallation, strategiesRoutes);
app.use('/api/anomaly', checkInstallation, anomalyRoutes);

const port = process.env.BACKEND_PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 