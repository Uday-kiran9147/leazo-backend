import { Request, Response } from 'express';
import { UploadService } from '../services/upload.service';

export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  uploadImage = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'No image file provided' });
        return;
      }

      const ext = req.file.originalname.split('.').pop();
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
      
      const metadata = await this.uploadService.processAndUploadImage(
        filename,
        req.file.buffer,
        req.file.mimetype,
        req.body?.folder
      );
      console.log(metadata)
      res.status(200).json({
        success: true,
        message: 'Image uploaded successfully',
        data: metadata
      });
    } catch (error: any) {
      console.error('Upload Error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to process and upload image'
      });
    }
  }
}
