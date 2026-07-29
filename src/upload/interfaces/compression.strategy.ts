export interface CompressionStrategy {
  compress(buffer: Buffer): Promise<Buffer>;
}
