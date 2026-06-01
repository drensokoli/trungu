-- CreateEnum
CREATE TYPE "DatePrecision" AS ENUM ('DAY', 'MONTH', 'YEAR');

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "birthApprox" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "birthPrecision" "DatePrecision" NOT NULL DEFAULT 'DAY',
ADD COLUMN     "deathApprox" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deathPrecision" "DatePrecision" NOT NULL DEFAULT 'DAY';
