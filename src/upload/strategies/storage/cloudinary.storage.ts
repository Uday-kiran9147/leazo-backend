import { v2 as cloudinary } from 'cloudinary';
import { StorageStrategy, StorageResult } from '../../interfaces/storage.strategy';
import {logger} from './../../../utils/logger'

export class CloudinaryStorageStrategy implements StorageStrategy {
  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'Missing Cloudinary credentials. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env'
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    logger.info('Cloudinary storage initialized', 'CloudinaryStorage');
  }

  async upload(filename: string, buffer: Buffer, mimetype: string, folder?: string): Promise<StorageResult> {
    return new Promise((resolve, reject) => {
      const filenameWithoutExt = filename
        .replace(/\.[^.]+$/, '')
        .replace(/[^\w-]/g, '_'); // Replace non-alphanumeric/hyphen with underscore

      const startTime = Date.now();
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: filenameWithoutExt,
          resource_type: 'image',
          folder: folder ? `Leazo/${folder}` : 'Leazo',
          overwrite: true,
          timeout: 60000, // 60 seconds timeout
        },
        (error, result) => {
          const duration = Date.now() - startTime;
          if (error || !result) {
            let errorMsg = error?.message ?? 'Cloudinary upload failed';
            if (error?.http_code === 403 || errorMsg.includes('403')) {
              errorMsg = 'Cloudinary access forbidden (403): Invalid credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) or account restricted.';
            }
            logger.error(`Cloudinary upload failed after ${duration}ms: ${error ? JSON.stringify(error) : 'Unknown error'}`, 'CloudinaryStorage');
            return reject(new Error(errorMsg));
          }
          logger.info(`Cloudinary upload successful in ${duration}ms`, 'CloudinaryStorage');
          resolve({
            url: result.secure_url,
            bytes: result.bytes,
          });
        }
      );

      uploadStream.end(buffer);
    });
  }
}
