import { Router } from 'express';
import { auth } from '../middleware/auth.middleware';
import { upload, uploadFile } from '../utils/file_upload';

const filerouter = Router();

filerouter.post('/upload/file',upload,uploadFile)


export default filerouter