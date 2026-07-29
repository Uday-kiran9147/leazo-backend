import { Router } from 'express';
import multer from 'multer';
import { UploadModuleFactory } from '../factories/upload.factory';

const router = Router();

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

const uploadController = UploadModuleFactory.createController();

const processFileUpload = (req: any, res: any, next: any) => {
  upload.any()(req, res, (err: any) => {
    if (err) return next(err);
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};

router.post(
  '/image', 
  (req, res, next) => {
    req.setTimeout(120000); // 2 minutes
    next();
  },
  processFileUpload, 
  uploadController.uploadImage
);

export default router;
