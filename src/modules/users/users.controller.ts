import { Controller, Get, Post, Patch, Delete, Req, Res, UseGuards, Body } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { checkTenantPlanExpiry } from '../../middleware/plan_expiry.middleware';
import { NestUserService } from './users.service';

@Controller(['api/users', 'v1/api/users'])
export class UsersController {
  constructor(private readonly userService: NestUserService) {}

  @Get()
  async handleGetAllUsers(@Req() req: Request, @Res() res: Response) {
    return this.userService.getAllUsers(req, res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async handleGetUser(@Req() req: Request, @Res() res: Response) {
    return this.userService.getUser(req, res);
  }

  @Post('create-user')
  async handleCreateUser(@Req() req: Request, @Res() res: Response) {
    return this.userService.createUser(req, res);
  }

  @Patch('update-user')
  @UseGuards(JwtAuthGuard)
  async handleUpdateUser(@Req() req: Request, @Res() res: Response) {
    return this.userService.updateUser(req, res);
  }

  @Delete('delete/me')
  @UseGuards(JwtAuthGuard)
  async handleDeleteUser(@Req() req: Request, @Res() res: Response) {
    return this.userService.deleteUser(req, res);
  }

  @Get('get-portions')
  @UseGuards(JwtAuthGuard)
  async handleGetAllPortions(@Req() req: Request, @Res() res: Response) {
    return this.userService.getAllPortions(req, res);
  }

  @Get('notifications/get-notifications')
  @UseGuards(JwtAuthGuard)
  async handleGetNotifications(@Req() req: Request, @Res() res: Response) {
    return this.userService.getNotifications(req, res);
  }

  @Patch('notifications/mark-as-read/:id')
  @UseGuards(JwtAuthGuard)
  async handleMarkAsRead(@Req() req: Request, @Res() res: Response) {
    return this.userService.markAsRead(req, res);
  }

  @Post('submit-feedback')
  async handleSubmitFeedback(@Req() req: Request, @Res() res: Response) {
    return this.userService.submitFeedback(req, res);
  }

  @Get('feedbacks')
  async handleGetFeedbacks(@Req() req: Request, @Res() res: Response) {
    return this.userService.getFeedbacks(req, res);
  }

  @Get('search')
  async handleSearchPortions(@Req() req: Request, @Res() res: Response) {
    return this.userService.searchPortions(req, res);
  }

  @Post('reveal-contact')
  @UseGuards(JwtAuthGuard)
  async handleRevealContact(@Req() req: Request, @Res() res: Response) {
    return checkTenantPlanExpiry(req, res, () => this.userService.revealPortionContact(req, res));
  }

  @Post('activity')
  async handleActivity(@Req() req: Request, @Res() res: Response) {
    try {
      const { userId, activityType, deviceInfo, ipAddress } = req.body;
      await this.userService.trackActivity(userId, activityType, deviceInfo, ipAddress);
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error });
    }
  }
}
