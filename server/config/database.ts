import mysql, { Pool, PoolOptions } from 'mysql2/promise';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { decrypt } from '../utils/encryption';

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
}

interface EncryptedConfig {
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let connection: Pool | null = null;

export async function initializeDatabase(config: DatabaseConfig): Promise<Pool> {
  try {
    const tempConnection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password
    });

    const createDbQuery = `CREATE DATABASE IF NOT EXISTS \`${config.database}\``;
    await tempConnection.query(createDbQuery);
    await tempConnection.end();

    const poolConfig: PoolOptions = {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true
    };

    const pool = await mysql.createPool(poolConfig);
    await pool.query('SELECT 1');
    connection = pool;
    return connection;
  } catch (error: any) {
    throw new Error(`Database initialization failed: ${error.message}`);
  }
}

export async function getConnection(): Promise<Pool> {
  if (!connection) {
    try {
      const configPath = join(__dirname, '../../.env.encrypted');
      const encryptedConfig = JSON.parse(await fs.readFile(configPath, 'utf-8')) as EncryptedConfig;
      const dbConfig = encryptedConfig.database;
      
      const config: PoolOptions = {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: await decrypt(dbConfig.password),
        database: dbConfig.name,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      };

      connection = await mysql.createPool(config);
    } catch (error: any) {
      throw new Error(`Failed to initialize database connection: ${error.message}`);
    }
  }
  return connection;
}

export async function createTables(): Promise<void> {
  try {
    const conn = await getConnection();
    const sqlPath = join(__dirname, './migrations/STRUCTURE_InstallWizard.sql');
    const sqlContent = await fs.readFile(sqlPath, 'utf-8');
    
    const statements = sqlContent
      .replace(/\/\*[\s\S]*?\*\/|--.*$/gm, '')
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    for (const statement of statements) {
      try {
        if (statement.length > 0) {
          await conn.query(statement);
        }
      } catch (error: any) {
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }
  } catch (error) {
    throw error;
  }
} 