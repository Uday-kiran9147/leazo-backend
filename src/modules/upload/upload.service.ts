import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { UploadModuleFactory } from '../../upload/factories/upload.factory';

export interface IUploadService {
  processAndUpload(req: Request, res: Response, processFileUpload: Function): Promise<any>;
}

@Injectable()
export class UploadService implements IUploadService {
  private controllerInstance: any = null;

  private getController() {
    if (!this.controllerInstance) {
      this.controllerInstance = UploadModuleFactory.createController();
    }
    return this.controllerInstance;
  }

  async processAndUpload(req: Request, res: Response, processFileUpload: Function): Promise<any> {
    req.setTimeout(120000);
    const controller = this.getController();
    return processFileUpload(req, res, () => controller.uploadImage(req, res));
  }
}
