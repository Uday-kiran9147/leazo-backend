import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import {
  createOwner,
  deleteOwner,
  getOwnerById,
  deletePortion,
  getOwners,
  updateOwner,
  deleteBuilding,
  createBuilding,
  updateBuilding,
  getOwnerBuildings,
  createPortion,
  getPortionsByBuildingId,
  updatePortion,
  boostPortion,
  toggleIsActiveAndUpdateOwnerUsage
} from '../../controller/owner.controller';

export interface IOwnersService {
  createOwner(req: Request, res: Response): Promise<any>;
  updateOwner(req: Request, res: Response): Promise<any>;
  deleteOwner(req: Request, res: Response): Promise<any>;
  getOwners(req: Request, res: Response): Promise<any>;
  getOwnerById(req: Request, res: Response): Promise<any>;
  createBuilding(req: Request, res: Response): Promise<any>;
  updateBuilding(req: Request, res: Response): Promise<any>;
  deleteBuilding(req: Request, res: Response): Promise<any>;
  getOwnerBuildings(req: Request, res: Response): Promise<any>;
  createPortion(req: Request, res: Response): Promise<any>;
  updatePortion(req: Request, res: Response): Promise<any>;
  deletePortion(req: Request, res: Response): Promise<any>;
  boostPortion(req: Request, res: Response): Promise<any>;
  toggleIsActiveAndUpdateOwnerUsage(req: Request, res: Response): Promise<any>;
  getPortionsByBuildingId(req: Request, res: Response): Promise<any>;
}

@Injectable()
export class NestOwnersService implements IOwnersService {
  async createOwner(req: Request, res: Response): Promise<any> {
    return createOwner(req, res);
  }

  async updateOwner(req: Request, res: Response): Promise<any> {
    return updateOwner(req, res);
  }

  async deleteOwner(req: Request, res: Response): Promise<any> {
    return deleteOwner(req, res);
  }

  async getOwners(req: Request, res: Response): Promise<any> {
    return getOwners(req, res);
  }

  async getOwnerById(req: Request, res: Response): Promise<any> {
    return getOwnerById(req, res);
  }

  async createBuilding(req: Request, res: Response): Promise<any> {
    return createBuilding(req, res);
  }

  async updateBuilding(req: Request, res: Response): Promise<any> {
    return updateBuilding(req, res);
  }

  async deleteBuilding(req: Request, res: Response): Promise<any> {
    return deleteBuilding(req, res);
  }

  async getOwnerBuildings(req: Request, res: Response): Promise<any> {
    return getOwnerBuildings(req, res);
  }

  async createPortion(req: Request, res: Response): Promise<any> {
    return createPortion(req, res);
  }

  async updatePortion(req: Request, res: Response): Promise<any> {
    return updatePortion(req, res);
  }

  async deletePortion(req: Request, res: Response): Promise<any> {
    return deletePortion(req, res);
  }

  async boostPortion(req: Request, res: Response): Promise<any> {
    return boostPortion(req, res);
  }

  async toggleIsActiveAndUpdateOwnerUsage(req: Request, res: Response): Promise<any> {
    return toggleIsActiveAndUpdateOwnerUsage(req, res);
  }

  async getPortionsByBuildingId(req: Request, res: Response): Promise<any> {
    return getPortionsByBuildingId(req, res);
  }
}
