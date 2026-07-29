import { CompressionStrategy } from '../interfaces/compression.strategy';
import { StorageStrategy } from '../interfaces/storage.strategy';

export interface UploadMetadata {
  originalSize: number;
  compressedSize: number;
  fileUrl: string;
  uploadedAt: Date;
}

export class UploadService {
  constructor(
    private readonly storage: StorageStrategy,
    private readonly compression: CompressionStrategy
  ) {}

  async processAndUploadImage(
    filename: string, 
    buffer: Buffer, 
    mimetype: string,
    folder?: string
  ): Promise<UploadMetadata> {
    const originalSize = buffer.length;
    
    const compressedBuffer = await this.compression.compress(buffer);
    const compressedSize = compressedBuffer.length;
    
    const webpFilename = `${filename.split('.')[0]}.webp`;
    
    const result = await this.storage.upload(webpFilename, compressedBuffer, 'image/webp', folder);
    
    return {
      originalSize,
      compressedSize,
      fileUrl: result.url,
      uploadedAt: new Date(),
    };
  }
}
