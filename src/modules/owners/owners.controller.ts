import { Controller, Get, Post, Patch, Delete, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { checkOwnerPlanExpiry } from '../../middleware/plan_expiry.middleware';
import { checkPlanLimit } from '../../middleware/plan_limit.middleware';
import { NestOwnersService } from './owners.service';

@Controller(['api/owners', 'v1/api/owners'])
@UseGuards(JwtAuthGuard)
export class OwnersController {
  constructor(private readonly ownersService: NestOwnersService) {}

  @Post('create-owner')
  async handleCreateOwner(@Req() req: Request, @Res() res: Response) {
    return this.ownersService.createOwner(req, res);
  }

  @Patch('update-owner')
  async handleUpdateOwner(@Req() req: Request, @Res() res: Response) {
    return this.ownersService.updateOwner(req, res);
  }

  @Delete('delete-owner')
  async handleDeleteOwner(@Req() req: Request, @Res() res: Response) {
    return this.ownersService.deleteOwner(req, res);
  }

  @Get('get-owners')
  async handleGetOwners(@Req() req: Request, @Res() res: Response) {
    return this.ownersService.getOwners(req, res);
  }

  @Get('me')
  async handleGetOwnerById(@Req() req: Request, @Res() res: Response) {
    return this.ownersService.getOwnerById(req, res);
  }

  // Buildings
  @Post('create-building')
  async handleCreateBuilding(@Req() req: Request, @Res() res: Response) {
    return this.ownersService.createBuilding(req, res);
  }

  @Patch('update-building')
  async handleUpdateBuilding(@Req() req: Request, @Res() res: Response) {
    return this.ownersService.updateBuilding(req, res);
  }

  @Delete('delete-building')
  async handleDeleteBuilding(@Req() req: Request, @Res() res: Response) {
    return this.ownersService.deleteBuilding(req, res);
  }

  @Get('buildings/me')
  async handleGetOwnerBuildings(@Req() req: Request, @Res() res: Response) {
    return this.ownersService.getOwnerBuildings(req, res);
  }

  // Portions
  @Post('buildings/create-portion')
  async handleCreatePortion(@Req() req: Request, @Res() res: Response) {
    return checkOwnerPlanExpiry(req, res, () =>
      checkPlanLimit(req, res, () => this.ownersService.createPortion(req, res))
    );
  }

  @Patch('buildings/update-portion')
  async handleUpdatePortion(@Req() req: Request, @Res() res: Response) {
    return checkOwnerPlanExpiry(req, res, () =>
      checkPlanLimit(req, res, () => this.ownersService.updatePortion(req, res))
    );
  }

  @Delete('buildings/delete-portion')
  async handleDeletePortion(@Req() req: Request, @Res() res: Response) {
    return this.ownersService.deletePortion(req, res);
  }

  @Post('buildings/boost-portion')
  async handleBoostPortion(@Req() req: Request, @Res() res: Response) {
    return checkOwnerPlanExpiry(req, res, () => this.ownersService.boostPortion(req, res));
  }

  @Patch('buildings/toggle-portion-status')
  async handleTogglePortionStatus(@Req() req: Request, @Res() res: Response) {
    return checkOwnerPlanExpiry(req, res, () => this.ownersService.toggleIsActiveAndUpdateOwnerUsage(req, res));
  }

  @Get('buildings/get-portions')
  async handleGetPortionsByBuildingId(@Req() req: Request, @Res() res: Response) {
    return this.ownersService.getPortionsByBuildingId(req, res);
  }
}
