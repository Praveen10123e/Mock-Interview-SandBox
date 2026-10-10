export interface StorageProvider {
  upload(file: Express.Multer.File, key: string): Promise<string>;
  getSignedUrl(key: string): Promise<string>;
  delete(key: string): Promise<void>;
}
