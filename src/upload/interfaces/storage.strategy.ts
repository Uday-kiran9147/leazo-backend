export interface StorageResult {
  url: string;
  bytes: number;
}

export interface StorageStrategy {
  upload(filename: string, buffer: Buffer, mimetype: string, folder?: string): Promise<StorageResult>;
}
