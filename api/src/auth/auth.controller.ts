import { BadRequestException, Body, Controller, Get, Patch, Request } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('me')
  async me(@Request() req: { user?: { userId: string; email: string } }) {
    if (!req.user?.userId) return { user: null };
    return { user: await this.auth.getProfile(req.user.userId) };
  }

  @Patch('me')
  async updateMe(
    @Request() req: { user?: { userId: string } },
    @Body() body: { phone?: string | null },
  ) {
    if (!req.user?.userId) throw new BadRequestException('Not authenticated');
    if (body && 'phone' in body) {
      const phone = body.phone === '' || body.phone === undefined ? null : body.phone;
      if (phone !== null && typeof phone !== 'string') {
        throw new BadRequestException('phone must be a string or null');
      }
      await this.auth.updatePhone(req.user.userId, phone);
    }
    return { user: await this.auth.getProfile(req.user.userId) };
  }
}
