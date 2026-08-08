import { Controller, Get, Post, Patch, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import ApiResponse from '../../utils/api_response';
import { logger } from '../../utils/logger';

@Controller(['v1/api/admin', 'api/admin'])
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Patch(':id/role')
  async handleUpdateRole(@Req() req: Request, @Res() res: Response) {
    return this.adminService.updateRole(req, res);
  }

  @Get('dashboard')
  async handleGetDashboardStats(@Req() req: Request, @Res() res: Response) {
    return this.adminService.getDashboardStats(req, res);
  }

  @Get('user-distribution')
  async handleGetUserRolesDistribution(@Req() req: Request, @Res() res: Response) {
    return this.adminService.getUserRolesDistribution(req, res);
  }

  @Get('users')
  async handleGetAllUsers(@Req() req: Request, @Res() res: Response) {
    return this.adminService.getAllUsers(req, res);
  }

  @Patch('update-portion-status/:id/:status')
  async handleUpdatePortionStatus(@Req() req: Request, @Res() res: Response) {
    return this.adminService.updatePortionStatus(req, res);
  }

  @Get('get-portions/:status')
  async handleGetPortionsByStatus(@Req() req: Request, @Res() res: Response) {
    return this.adminService.getPortionsByStatus(req, res);
  }

  @Post('push-notification')
  async handleSendNotificationToUsers(@Req() req: Request, @Res() res: Response) {
    return this.adminService.sendNotificationToUsers(req, res);
  }

  @Get('weekly-activity')
  async handleGetWeeklyActivity(@Req() req: Request, @Res() res: Response) {
    try {
      const result = await this.adminService.getWeeklyActivity();
      return res.json(new ApiResponse(200, 'success', result));
    } catch (error) {
      return res.status(500).json({ error });
    }
  }

  @Get('weekly-listings')
  async handleGetWeeklyListings(@Req() req: Request, @Res() res: Response) {
    try {
      const result = await this.adminService.getWeeklyListings();
      return res.json(new ApiResponse(200, 'success', result));
    } catch (error) {
      return res.status(500).json({ error });
    }
  }

  @Get('dau')
  async handleGetDAU(@Req() req: Request, @Res() res: Response) {
    try {
      const { date } = req.query;
      const queryDate = date ? new Date(date as string) : new Date();
      const result = await this.adminService.getDAU(queryDate);
      return res.json(new ApiResponse(200, 'success', result));
    } catch (error) {
      return res.status(500).json({ error });
    }
  }

  @Get('mau')
  async handleGetMAU(@Req() req: Request, @Res() res: Response) {
    try {
      const { year, month } = req.query;
      const queryYear = year ? parseInt(year as string) : new Date().getFullYear();
      const queryMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const result = await this.adminService.getMAU(queryYear, queryMonth);
      return res.json(new ApiResponse(200, 'success', result));
    } catch (error) {
      return res.status(500).json({ error });
    }
  }

  @Get('yau')
  async handleGetYAU(@Req() req: Request, @Res() res: Response) {
    try {
      const { year } = req.query;
      const queryYear = year ? parseInt(year as string) : new Date().getFullYear();
      const result = await this.adminService.getYAU(queryYear);
      return res.json(new ApiResponse(200, 'success', result));
    } catch (error) {
      return res.status(500).json({ error });
    }
  }

  @Get('retention')
  async handleGetRetention(@Req() req: Request, @Res() res: Response) {
    logger.debug('Retention rate query parameters', { query: req.query });
    try {
      const { period } = req.query;
      const result = await this.adminService.getRetention(period as 'day' | 'month' | 'year');
      return res.json(new ApiResponse(200, 'success', result));
    } catch (error) {
      return res.status(500).json({ error });
    }
  }
}
