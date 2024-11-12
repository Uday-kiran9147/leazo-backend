import { Router } from 'express';
import { getAllUsers, createUser, getUser, updateUser,getAllPortions,deleteUser } from '../controller/user.controller';
import { auth } from '../middleware/auth.middleware';


const userRouter = Router();

userRouter.get('/', getAllUsers);// DONE
userRouter.get('/me',auth, getUser);// DONE
userRouter.post('/create-user', createUser); // DONE
userRouter.patch('/update-user',auth, updateUser); // DONE
userRouter.delete('/delete/me',auth,deleteUser); 
userRouter.get('/get-portions',auth,getAllPortions) //DONE


export default userRouter;
