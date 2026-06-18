-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'HR', 'ACCOUNTS');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'O_POS', 'O_NEG', 'AB_POS', 'AB_NEG');

-- CreateEnum
CREATE TYPE "EmpType" AS ENUM ('INTERN', 'ON_ROLLS', 'ON_CONTRACT');

-- CreateEnum
CREATE TYPE "EmpStatus" AS ENUM ('ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TaxRegime" AS ENUM ('NEW', 'OLD');

-- CreateEnum
CREATE TYPE "Relationship" AS ENUM ('SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'PROCESSED', 'APPROVED', 'PAID');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'HR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "sex" "Sex" NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "bloodGroup" "BloodGroup",
    "fathersName" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "area" TEXT,
    "city" TEXT,
    "stateName" TEXT,
    "country" TEXT DEFAULT 'India',
    "pincode" TEXT,
    "designation" TEXT,
    "type" "EmpType" NOT NULL DEFAULT 'ON_ROLLS',
    "status" "EmpStatus" NOT NULL DEFAULT 'PROBATION',
    "dateOfJoining" TIMESTAMP(3),
    "dateOfExit" TIMESTAMP(3),
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "aadhaarNumber" TEXT,
    "panNumber" TEXT,
    "epfNumber" TEXT,
    "uanNumber" TEXT,
    "esiNumber" TEXT,
    "taxRegime" "TaxRegime" NOT NULL DEFAULT 'NEW',
    "ptState" TEXT NOT NULL DEFAULT 'MH',
    "grossSalary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "basic" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "hra" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "special" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "medical" DECIMAL(12,2) NOT NULL DEFAULT 1250,
    "conveyance" DECIMAL(12,2) NOT NULL DEFAULT 1600,
    "otherAllowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bankAccount" TEXT,
    "ifsc" TEXT,
    "bankName" TEXT,
    "photoPath" TEXT,
    "aadhaarDocPath" TEXT,
    "panDocPath" TEXT,
    "bankPassbookPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dependents" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "sex" "Sex" NOT NULL,
    "relationship" "Relationship" NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dependents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "workingDays" INTEGER NOT NULL DEFAULT 26,
    "lopDays" INTEGER NOT NULL DEFAULT 0,
    "otHours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_runs" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'PROCESSED',
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runBy" TEXT,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslips" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "workingDays" INTEGER NOT NULL,
    "presentDays" INTEGER NOT NULL,
    "lopDays" INTEGER NOT NULL,
    "otHours" DECIMAL(6,2) NOT NULL,
    "basic" DECIMAL(12,2) NOT NULL,
    "hra" DECIMAL(12,2) NOT NULL,
    "special" DECIMAL(12,2) NOT NULL,
    "medical" DECIMAL(12,2) NOT NULL,
    "conveyance" DECIMAL(12,2) NOT NULL,
    "other" DECIMAL(12,2) NOT NULL,
    "otPay" DECIMAL(12,2) NOT NULL,
    "gross" DECIMAL(12,2) NOT NULL,
    "empPF" DECIMAL(12,2) NOT NULL,
    "empESI" DECIMAL(12,2) NOT NULL,
    "pt" DECIMAL(12,2) NOT NULL,
    "tds" DECIMAL(12,2) NOT NULL,
    "totalDed" DECIMAL(12,2) NOT NULL,
    "emplPF" DECIMAL(12,2) NOT NULL,
    "emplESI" DECIMAL(12,2) NOT NULL,
    "net" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "companyName" TEXT NOT NULL DEFAULT 'Your Company Ltd.',
    "address" TEXT NOT NULL DEFAULT '',
    "cin" TEXT NOT NULL DEFAULT '',
    "tan" TEXT NOT NULL DEFAULT '',
    "pan" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT 'MH',
    "pfCeiling" INTEGER NOT NULL DEFAULT 15000,
    "esiCeiling" INTEGER NOT NULL DEFAULT 21000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeCode_key" ON "employees"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "employees_aadhaarNumber_key" ON "employees"("aadhaarNumber");

-- CreateIndex
CREATE UNIQUE INDEX "employees_panNumber_key" ON "employees"("panNumber");

-- CreateIndex
CREATE UNIQUE INDEX "employees_epfNumber_key" ON "employees"("epfNumber");

-- CreateIndex
CREATE UNIQUE INDEX "employees_uanNumber_key" ON "employees"("uanNumber");

-- CreateIndex
CREATE UNIQUE INDEX "employees_esiNumber_key" ON "employees"("esiNumber");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_employeeId_month_year_key" ON "attendance"("employeeId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_month_year_key" ON "payroll_runs"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_payrollRunId_employeeId_key" ON "payslips"("payrollRunId", "employeeId");

-- AddForeignKey
ALTER TABLE "dependents" ADD CONSTRAINT "dependents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
