import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        subscriptions: {
          select: {
            id: true,
            plan: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
            scheduledPlan: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        examBaseAttempts: {
          select: {
            id: true,
            startedAt: true,
            finishedAt: true,
            scorePercentage: true,
            examBase: {
              select: {
                id: true,
                name: true,
                institution: true,
                role: true,
              },
            },
          },
          orderBy: { startedAt: 'desc' },
        },
        trainingSessions: {
          select: {
            id: true,
            currentStage: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => {
      const currentSubscription = user.subscriptions[0] ?? null;
      const lastActivity = user.examBaseAttempts[0]?.startedAt ?? null;

      return {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
        lastActivity,
        currentSubscription,
        examAttemptCount: user.examBaseAttempts.length,
        trainingSessionCount: user.trainingSessions.length,
        examAttempts: user.examBaseAttempts,
      };
    });
  }
}
