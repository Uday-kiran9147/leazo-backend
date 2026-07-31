import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import {
  getAllUsers,
  getDashboardStats,
  getPortionsByStatus,
  getUserRolesDistribution,
  sendNotificationToUsers,
  UpdatePortionStatus,
  UpdateRole
} from '../../controller/admin.Controller';
import { analyticsService } from '../../controller/analytic.Controller';
import ApiResponse from '../../utils/api_response';

export interface IAdminService {
  updateRole(req: Request, res: Response): Promise<any>;
  getDashboardStats(req: Request, res: Response): Promise<any>;
  getUserRolesDistribution(req: Request, res: Response): Promise<any>;
  getAllUsers(req: Request, res: Response): Promise<any>;
  updatePortionStatus(req: Request, res: Response): Promise<any>;
  getPortionsByStatus(req: Request, res: Response): Promise<any>;
  sendNotificationToUsers(req: Request, res: Response): Promise<any>;
  getWeeklyActivity(): Promise<any>;
  getWeeklyListings(): Promise<any>;
  getDAU(date?: Date): Promise<any>;
  getMAU(year?: number, month?: number): Promise<any>;
  getYAU(year?: number): Promise<any>;
  getRetention(period?: 'day' | 'month' | 'year'): Promise<any>;
}

@Injectable()
export class AdminService implements IAdminService {
  async updateRole(req: Request, res: Response): Promise<any> {
    return UpdateRole(req, res);
  }

  async getDashboardStats(req: Request, res: Response): Promise<any> {
    return getDashboardStats(req, res);
  }

  async getUserRolesDistribution(req: Request, res: Response): Promise<any> {
    return getUserRolesDistribution(req, res);
  }

  async getAllUsers(req: Request, res: Response): Promise<any> {
    return getAllUsers(req, res);
  }

  async updatePortionStatus(req: Request, res: Response): Promise<any> {
    return UpdatePortionStatus(req, res);
  }

  async getPortionsByStatus(req: Request, res: Response): Promise<any> {
    return getPortionsByStatus(req, res);
  }

  async sendNotificationToUsers(req: Request, res: Response): Promise<any> {
    return sendNotificationToUsers(req, res);
  }

  async getWeeklyActivity(): Promise<any> {
    return analyticsService.getWeeklyActivity();
  }

  async getWeeklyListings(): Promise<any> {
    return analyticsService.getWeeklyListings();
  }

  async getDAU(date?: Date): Promise<any> {
    return analyticsService.getDAU(date || new Date());
  }

  async getMAU(year?: number, month?: number): Promise<any> {
    return analyticsService.getMAU(year || new Date().getFullYear(), month || new Date().getMonth() + 1);
  }

  async getYAU(year?: number): Promise<any> {
    return analyticsService.getYAU(year || new Date().getFullYear());
  }

  async getRetention(period?: 'day' | 'month' | 'year'): Promise<any> {
    return analyticsService.getRetentionRate(period || 'month');
  }
}
