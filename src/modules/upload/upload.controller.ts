import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import multer from 'multer';
import { UploadService } from './upload.service';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

const processFileUpload = (req: any, res: any, next: any) => {
  upload.any()(req, res, (err: any) => {
    if (err) return next(err);
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};

@Controller(['v1/api', 'api'])
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('upload/file')
  async handleFileUpload(@Req() req: Request, @Res() res: Response) {
    return this.uploadService.processAndUpload(req, res, processFileUpload);
  }
}
