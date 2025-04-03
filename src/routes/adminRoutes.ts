import Router from 'express';
import { auth } from '../middleware/auth.middleware';
import { getDashboardStats, getPortionsByStatus, UpdatePortionStatus, UpdateRole } from '../controller/admin.Controller';
import { isAdminMiddleware } from '../middleware/isAdmin.middleware';

export const adminRouter = Router();

adminRouter.patch('/:id/role',auth,UpdateRole)
adminRouter.get('/dashboard', getDashboardStats);
adminRouter.patch('/update-portion-status/:id/:status',auth,isAdminMiddleware,UpdatePortionStatus)
adminRouter.get('/get-portions/:status',auth,isAdminMiddleware,getPortionsByStatus)
