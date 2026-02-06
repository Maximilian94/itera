import { Controller, Get, Request } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Get('me')
  me(@Request() req: { user?: { userId: string; email: string } }) {
    return { user: { id: req.user?.userId, email: req.user?.email } };
  }
}
