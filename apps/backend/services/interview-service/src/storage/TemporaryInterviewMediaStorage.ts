import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

export interface ITemporaryInterviewMediaStorage {
  save(storageKey: string, buffer: Buffer, mimeType: string): Promise<void>;
  get(storageKey: string): Promise<Buffer | null>;
  getStream(storageKey: string, options?: { start?: number; end?: number }): Promise<Readable | null>;
  delete(storageKey: string): Promise<boolean>;
  exists(storageKey: string): Promise<boolean>;
  getSize(storageKey: string): Promise<number>;
  getFilePath(storageKey: string): string;
}

export class LocalTemporaryInterviewMediaStorage implements ITemporaryInterviewMediaStorage {
  private baseDir: string;

  constructor(customBaseDir?: string) {
    this.baseDir = customBaseDir || path.resolve(process.cwd(), 'storage', 'temp_media');
    this.ensureBaseDir();
  }

  private ensureBaseDir(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Sanitizes and returns the absolute local path for a given storageKey.
   * Prevents directory traversal attacks.
   */
  public getFilePath(storageKey: string): string {
    const sanitizedKey = storageKey.replace(/\\/g, '/').replace(/\.\./g, '').replace(/^\/+/, '');
    const fullPath = path.resolve(this.baseDir, sanitizedKey);

    // Verify the path is within baseDir
    if (!fullPath.startsWith(path.resolve(this.baseDir))) {
      throw new Error('Invalid storage key: directory traversal attempt');
    }

    return fullPath;
  }

  public async save(storageKey: string, buffer: Buffer, mimeType: string): Promise<void> {
    const filePath = this.getFilePath(storageKey);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }

    await fs.promises.writeFile(filePath, buffer);
  }

  public async get(storageKey: string): Promise<Buffer | null> {
    const filePath = this.getFilePath(storageKey);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return fs.promises.readFile(filePath);
  }

  public async getStream(
    storageKey: string,
    options?: { start?: number; end?: number }
  ): Promise<Readable | null> {
    const filePath = this.getFilePath(storageKey);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return fs.createReadStream(filePath, options);
  }

  public async delete(storageKey: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(storageKey);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        
        // Optional: clean up empty parent dir
        const parentDir = path.dirname(filePath);
        if (parentDir !== this.baseDir && fs.existsSync(parentDir)) {
          const files = await fs.promises.readdir(parentDir);
          if (files.length === 0) {
            await fs.promises.rmdir(parentDir).catch(() => {});
          }
        }
        return true;
      }
      return false;
    } catch (err) {
      console.warn(`[TemporaryInterviewMediaStorage] Delete error for key ${storageKey}:`, err);
      return false;
    }
  }

  public async exists(storageKey: string): Promise<boolean> {
    const filePath = this.getFilePath(storageKey);
    return fs.existsSync(filePath);
  }

  public async getSize(storageKey: string): Promise<number> {
    const filePath = this.getFilePath(storageKey);
    if (!fs.existsSync(filePath)) {
      return 0;
    }
    const stat = await fs.promises.stat(filePath);
    return stat.size;
  }
}

// Singleton storage instance for the application
export const TemporaryMediaStorage = new LocalTemporaryInterviewMediaStorage();
