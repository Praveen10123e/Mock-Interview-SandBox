import { StorageProvider } from './StorageProvider';
import { LocalStorageProvider } from './LocalStorageProvider';
import { S3StorageProvider } from './S3StorageProvider';

export class StorageFactory {
  private static instance: StorageProvider;

  static getProvider(): StorageProvider {
    if (!this.instance) {
      const type = process.env.STORAGE_PROVIDER || 'local';
      if (type === 's3') {
        this.instance = new S3StorageProvider();
      } else {
        this.instance = new LocalStorageProvider();
      }
    }
    return this.instance;
  }
}
