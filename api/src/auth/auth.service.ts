import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Syncs user from Clerk webhook (user.created, user.updated).
   * Creates or updates by clerkUserId/email. Idempotent for webhook retries.
   */
  async syncUserFromClerk(
    clerkUserId: string,
    email: string,
  ): Promise<{ id: string; email: string }> {
    const existingByClerk = await this.prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true, email: true },
    });

    if (existingByClerk) {
      if (existingByClerk.email !== email) {
        await this.prisma.user.update({
          where: { id: existingByClerk.id },
          data: { email },
        });
        return { id: existingByClerk.id, email };
      }
      return existingByClerk;
    }

    const existingByEmail = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (existingByEmail) {
      await this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: { clerkUserId },
      });
      return existingByEmail;
    }

    return this.prisma.user.create({
      data: { email, clerkUserId },
      select: { id: true, email: true },
    });
  }

  /**
   * Handles user.deleted from Clerk. Sets clerkUserId to null so the user
   * cannot log in, but keeps the record for audit (purchases, subscriptions).
   */
  async handleUserDeleted(clerkUserId: string): Promise<void> {
    await this.prisma.user.updateMany({
      where: { clerkUserId },
      data: { clerkUserId: null },
    });
  }

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

  async getProfile(userId: string): Promise<{ id: string; email: string; phone: string | null; role: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phone: true, role: true },
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
