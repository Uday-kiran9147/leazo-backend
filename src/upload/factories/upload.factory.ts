import { QualityCompressionStrategy } from '../strategies/compression/quality.compression';
import { CloudinaryStorageStrategy } from '../strategies/storage/cloudinary.storage';
import { UploadService } from '../services/upload.service';
import { UploadController } from '../controllers/upload.controller';

export class UploadModuleFactory {
  static createController(): UploadController {
    const compressionStrategy = new QualityCompressionStrategy(80);
    const storageStrategy = new CloudinaryStorageStrategy();

    const uploadService = new UploadService(storageStrategy, compressionStrategy);

    return new UploadController(uploadService);
  }
}

