import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';

@Controller(['api/auth', 'v1/api/auth'])
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  async handleSignUp(@Req() req: Request, @Res() res: Response) {
    return this.authService.signUp(req, res);
  }

  @Post('login')
  async handleLogin(@Req() req: Request, @Res() res: Response) {
    return this.authService.login(req, res);
  }

  @Post('forgot-password')
  async handleForgotPassword(@Req() req: Request, @Res() res: Response) {
    return this.authService.forgotPassword(req, res);
  }

  @Post('reset-password')
  async handleResetPassword(@Req() req: Request, @Res() res: Response) {
    return this.authService.resetPassword(req, res);
  }
}
