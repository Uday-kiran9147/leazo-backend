import { Router, Request, Response } from 'express';
import { getAllUsers, createUser, getUser, updateUser,getAllPortions,deleteUser, getNotifications, markAsRead } from '../controller/user.controller';
import { auth } from '../middleware/auth.middleware';
import { User } from '../models/user.model';

const userRouter = Router();

userRouter.get('/', getAllUsers);// DONE
userRouter.get('/me',auth, getUser);// DONE
userRouter.post('/create-user', createUser); // DONE
userRouter.patch('/update-user',auth, updateUser); // DONE
userRouter.delete('/delete/me',auth,deleteUser); 
userRouter.get('/get-portions',auth,getAllPortions) //DONE
userRouter.get('/notifications/get-notifications',auth,getNotifications)
userRouter.patch('/notifications/mark-as-read/:id',auth,markAsRead)


// Track user activity
userRouter.post('/activity', async (req:Request, res:Response) => {
  try {
    const { userId, activityType, deviceInfo, ipAddress } = req.body;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.trackActivity(activityType, deviceInfo, ipAddress);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});


export default userRouter;
