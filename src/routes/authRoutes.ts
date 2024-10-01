import { Router } from "express";
import { login, signUp } from "../controller/auth.Controller";


const authRouter = Router()
authRouter.post('/sign-up', signUp) // DONE
authRouter.post('/login', login)    // DONE

export default authRouter
