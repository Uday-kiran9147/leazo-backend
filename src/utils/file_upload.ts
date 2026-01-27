import admin from 'firebase-admin';
import multer from 'multer';
import ApiResponse from './api_response';
import ApiError from './api_error';
import { Request,Response } from 'express';
import { logger } from './logger';

// Set up Multer for handling file uploads
const storage = multer.memoryStorage();
// const upload = multer({ storage: storage });

export const upload = multer({ storage: storage }).single('fileName');

export const uploadFile = async (req: Request, res: Response) => {
    logger.debug(`File upload request: ${req.originalUrl}`);
    
    const file = req.file;

    if (!file) {
        logger.error('No file provided in upload request');
        return res.status(400).json({ message: 'File is not specified' });
    }

    try {
        const folder = req.body.folder
        const allowedFolders = ["Buildings", "Portions",];

        if (!allowedFolders.includes(folder)) {
            const apiResponse = new ApiError(400, `Invalid folder value. Allowed values are "Buildings, Portions"`);
            logger.error('Invalid folder value during upload', { folder });
            return res.status(400).json(apiResponse);
        }
        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}-Leaz-storage-${file.originalname}`;
        const filePath = `${folder}/${filename}`;

        // Create a storage reference with the desired path
        const storageRef = admin.storage().bucket().file(filePath);

        // Upload the file to the storage reference
        storageRef.createWriteStream().end(file.buffer);

        // Get the download URL of the uploaded file
        const downloadURL = await storageRef.getSignedUrl({ action: 'read', expires: '03-09-3025' });
        const fileUrl = downloadURL[0];
        logger.success(`File uploaded successfully to ${folder}`, { filename });
        const apiResponse = new ApiResponse(200, "File uploaded successfully", { fileUrl });
        return res.status(200).json(apiResponse);
    } catch (error) {
        logger.error('Failed to upload file to storage', error);
        const apiResponse = new ApiError(400, 'Failed to upload file',);
        
        return res.status(400).json(apiResponse);
    }
}