import { StorageProvider } from './StorageProvider';
import fs from 'fs/promises';
import path from 'path';

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;
  private baseUrl: string;

  constructor() {
    this.baseDir = process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), 'uploads');
    this.baseUrl = process.env.LOCAL_STORAGE_URL || 'http://localhost:3002/uploads';
    
    // Ensure directory exists
    fs.mkdir(this.baseDir, { recursive: true }).catch(console.error);
  }

  async upload(file: Express.Multer.File, key: string): Promise<string> {
    const filePath = path.join(this.baseDir, key);
    
    // Create subdirectories if key contains them
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(filePath, file.buffer);
    return key;
  }

  async getSignedUrl(key: string): Promise<string> {
    // Local storage doesn't need signing, just return the direct URL
    // Make sure to encode the key so spaces/special characters are valid in URL
    return `${this.baseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.baseDir, key);
    try {
      await fs.unlink(filePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
