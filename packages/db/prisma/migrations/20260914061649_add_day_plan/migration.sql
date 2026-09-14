-- CreateTable
CREATE TABLE "day_plan" (
    "userId" TEXT NOT NULL,
    "day" VARCHAR(10) NOT NULL,
    "intention" VARCHAR(280) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "day_plan_pkey" PRIMARY KEY ("userId","day")
);

-- AddForeignKey
ALTER TABLE "day_plan" ADD CONSTRAINT "day_plan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
