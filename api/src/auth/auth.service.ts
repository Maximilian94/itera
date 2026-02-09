import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateByClerk(
    clerkUserId: string,
    email: string,
  ): Promise<{ id: string; email: string }> {
    let user = await this.prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true, email: true },
    });

    if (user) {
      return user;
    }

    user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (user) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { clerkUserId },
      });
      return user;
    }

    const created = await this.prisma.user.create({
      data: { email, clerkUserId },
      select: { id: true, email: true },
    });
    return created;
  }

  async getProfile(userId: string): Promise<{ id: string; email: string; phone: string | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phone: true },
    });
    if (!user) throw new Error('User not found');
    return user;
  }

  async updatePhone(userId: string, phone: string | null): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { phone: phone?.trim() || null },
    });
  }
}
