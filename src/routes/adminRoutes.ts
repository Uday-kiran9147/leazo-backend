import Router, { Request, Response } from 'express';
import { auth } from '../middleware/auth.middleware';
import { getDashboardStats, getPortionsByStatus, UpdatePortionStatus, UpdateRole } from '../controller/admin.Controller';
import { isAdminMiddleware } from '../middleware/isAdmin.middleware';
import { analyticsService } from '../controller/analytic.Controller';
import { User } from '../models/user.model';
import ApiResponse from '../utils/api_response';

export const adminRouter = Router();

adminRouter.patch('/:id/role',auth,UpdateRole)
adminRouter.get('/dashboard', getDashboardStats);
adminRouter.patch('/update-portion-status/:id/:status',auth,isAdminMiddleware,UpdatePortionStatus)
adminRouter.get('/get-portions/:status',auth,isAdminMiddleware,getPortionsByStatus)

// Get DAU
adminRouter.get('/dau', async (req, res) => {
  try {
    const { date } = req.query;
    const queryDate = date ? new Date(date as string) : new Date();
    const result = await analyticsService.getDAU(queryDate);
    var apiResponse: ApiResponse = new ApiResponse(200,"success",result)
    res.json(apiResponse);
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

// Get MAU
adminRouter.get('/mau', async (req, res) => {
  try {
    const { year, month } = req.query;
    const queryYear = year ? parseInt(year as string) : new Date().getFullYear();
    const queryMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
    const result = await analyticsService.getMAU(queryYear, queryMonth);
    var apiResponse: ApiResponse = new ApiResponse(200,"success",result)
    res.json(apiResponse);
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

// Get YAU
adminRouter.get('/yau', async (req, res) => {
  try {
    const { year } = req.query;
    const queryYear = year ? parseInt(year as string) : new Date().getFullYear();
    const result = await analyticsService.getYAU(queryYear);
    var apiResponse: ApiResponse = new ApiResponse(200,"success",result)
    res.json(apiResponse);
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

// Get Retention Rate
adminRouter.get('/retention', async (req, res) => {
  console.log(req.query);
  
  try {
    const { period } = req.query;
    const result = await analyticsService.getRetentionRate(period as 'day' | 'month' | 'year');
    var apiResponse: ApiResponse = new ApiResponse(200,"success",result)
    res.json(apiResponse);
  } catch (error) {
    res.status(500).json({ error });
  }
});