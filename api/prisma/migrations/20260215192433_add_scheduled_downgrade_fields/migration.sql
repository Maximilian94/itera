-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "scheduledPlan" "SubscriptionPlan",
ADD COLUMN     "scheduledPriceId" TEXT,
ADD COLUMN     "stripeScheduleId" TEXT;
