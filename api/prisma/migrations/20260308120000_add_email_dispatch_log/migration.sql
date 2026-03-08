-- CreateTable
CREATE TABLE "email_dispatch_logs" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalEventId" TEXT,
    "jobId" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "email_dispatch_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_dispatch_logs_jobId_idx" ON "email_dispatch_logs"("jobId");

-- CreateIndex
CREATE INDEX "email_dispatch_logs_recipient_type_idx" ON "email_dispatch_logs"("recipient", "type");

-- CreateIndex
CREATE INDEX "email_dispatch_logs_status_idx" ON "email_dispatch_logs"("status");
