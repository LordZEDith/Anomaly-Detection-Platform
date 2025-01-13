import crypto from 'crypto';
import fs from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

interface EncryptedConfig {
  encryptionKey: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function getEncryptionKey(): Promise<string> {
  try {
    const configPath = join(__dirname, '../../.env.encrypted');
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8')) as EncryptedConfig;
    return config.encryptionKey;
  } catch (error) {
    console.error('Error reading encryption key:', error);
    throw new Error('Failed to read encryption key');
  }
}

export async function encrypt(text: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export async function decrypt(text: string): Promise<string> {
  const key = await getEncryptionKey();
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
} 