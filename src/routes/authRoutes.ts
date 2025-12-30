import { Router } from "express";
import { forgotPassword, login, resetPassword, signUp } from "../controller/auth.Controller";


const authRouter = Router()
authRouter.post('/sign-up', signUp) // DONE
authRouter.post('/login', login)    // DONE
authRouter.post('/forgot-password', forgotPassword)
authRouter.post('/reset-password', resetPassword)

export default authRouter
