import sharp from 'sharp';
import { CompressionStrategy } from '../../interfaces/compression.strategy';

export class QualityCompressionStrategy implements CompressionStrategy {
  constructor(private readonly quality: number = 80) {}

  async compress(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
        .webp({ quality: this.quality }) // Webp provides better compression than jpeg
        .toBuffer();
  }
}
