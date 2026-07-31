import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import {
  getAllUsers,
  createUser,
  getUser,
  updateUser,
  getAllPortions,
  deleteUser,
  getNotifications,
  markAsRead,
  submitFeedback,
  getFeedbacks,
  searchPortions,
  revealPortionContact
} from '../../controller/user.controller';
import { User } from '../../models/user.model';

export interface IUserService {
  getAllUsers(req: Request, res: Response): Promise<any>;
  getUser(req: Request, res: Response): Promise<any>;
  createUser(req: Request, res: Response): Promise<any>;
  updateUser(req: Request, res: Response): Promise<any>;
  deleteUser(req: Request, res: Response): Promise<any>;
  getAllPortions(req: Request, res: Response): Promise<any>;
  getNotifications(req: Request, res: Response): Promise<any>;
  markAsRead(req: Request, res: Response): Promise<any>;
  submitFeedback(req: Request, res: Response): Promise<any>;
  getFeedbacks(req: Request, res: Response): Promise<any>;
  searchPortions(req: Request, res: Response): Promise<any>;
  revealPortionContact(req: Request, res: Response): Promise<any>;
  trackActivity(userId: string, activityType: string, deviceInfo?: string, ipAddress?: string): Promise<any>;
}

@Injectable()
export class NestUserService implements IUserService {
  async getAllUsers(req: Request, res: Response): Promise<any> {
    return getAllUsers(req, res);
  }

  async getUser(req: Request, res: Response): Promise<any> {
    return getUser(req, res);
  }

  async createUser(req: Request, res: Response): Promise<any> {
    return createUser(req, res);
  }

  async updateUser(req: Request, res: Response): Promise<any> {
    return updateUser(req, res);
  }

  async deleteUser(req: Request, res: Response): Promise<any> {
    return deleteUser(req, res);
  }

  async getAllPortions(req: Request, res: Response): Promise<any> {
    return getAllPortions(req, res);
  }

  async getNotifications(req: Request, res: Response): Promise<any> {
    return getNotifications(req, res);
  }

  async markAsRead(req: Request, res: Response): Promise<any> {
    return markAsRead(req, res);
  }

  async submitFeedback(req: Request, res: Response): Promise<any> {
    return submitFeedback(req, res);
  }

  async getFeedbacks(req: Request, res: Response): Promise<any> {
    return getFeedbacks(req, res);
  }

  async searchPortions(req: Request, res: Response): Promise<any> {
    return searchPortions(req, res);
  }

  async revealPortionContact(req: Request, res: Response): Promise<any> {
    return revealPortionContact(req, res);
  }

  async trackActivity(userId: string, activityType: string, deviceInfo?: string, ipAddress?: string): Promise<any> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user.trackActivity(activityType, deviceInfo, ipAddress);
  }
}
