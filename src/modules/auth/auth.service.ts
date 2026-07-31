import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { signUp, login, forgotPassword, resetPassword } from '../../controller/auth.Controller';

export interface IAuthService {
  signUp(req: Request, res: Response): Promise<any>;
  login(req: Request, res: Response): Promise<any>;
  forgotPassword(req: Request, res: Response): Promise<any>;
  resetPassword(req: Request, res: Response): Promise<any>;
}

@Injectable()
export class AuthService implements IAuthService {
  async signUp(req: Request, res: Response): Promise<any> {
    return signUp(req, res);
  }

  async login(req: Request, res: Response): Promise<any> {
    return login(req, res);
  }

  async forgotPassword(req: Request, res: Response): Promise<any> {
    return forgotPassword(req, res);
  }

  async resetPassword(req: Request, res: Response): Promise<any> {
    return resetPassword(req, res);
  }
}
