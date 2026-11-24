-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'MANAGER', 'STAFF', 'PARTTIME');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'RESIGNED');

-- CreateEnum
CREATE TYPE "InsuranceType" AS ENUM ('FOUR_INSURANCE', 'THREE_POINT_THREE');

-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('OPEN', 'CLOSE', 'OPEN_CLOSE', 'EVENING_PT', 'FULL_PT', 'OFF');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('NORMAL', 'LATE', 'EARLY_LEAVE', 'ABSENT', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "PayrollTaxType" AS ENUM ('PRE_TAX', 'POST_TAX');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'DONE');

-- CreateEnum
CREATE TYPE "EmployeeCategory" AS ENUM ('FULL_TIME_4INS', 'BUSINESS_INCOME_33', 'DAILY');

-- CreateEnum
CREATE TYPE "StoreType" AS ENUM ('OWN', 'COMPETITOR');

-- CreateTable
CREATE TABLE "branches" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "login_id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "phone" TEXT,
    "ssn" TEXT,
    "hire_date" DATE,
    "health_cert_expire" DATE,
    "bank_name" TEXT,
    "account_number" TEXT,
    "account_holder" TEXT,
    "monthly_salary" INTEGER,
    "insurance_type" "InsuranceType" NOT NULL DEFAULT 'FOUR_INSURANCE',
    "status" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "branch_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_branches" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" SERIAL NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "employee_name" TEXT NOT NULL,
    "work_type" "WorkType" NOT NULL,
    "work_date" DATE NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "work_hours" DECIMAL(5,2),
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memos" (
    "id" SERIAL NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "memo_content" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "is_important" BOOLEAN NOT NULL DEFAULT false,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "parent_memo_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" SERIAL NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "employee_name" TEXT NOT NULL,
    "attendance_date" DATE NOT NULL,
    "scheduled_start_time" TEXT,
    "scheduled_end_time" TEXT,
    "actual_start_time" TEXT,
    "actual_end_time" TEXT,
    "attendance_status" "AttendanceStatus" NOT NULL DEFAULT 'NORMAL',
    "late_minutes" INTEGER NOT NULL DEFAULT 0,
    "early_leave_minutes" INTEGER NOT NULL DEFAULT 0,
    "absence_reason" TEXT,
    "work_type" TEXT,
    "memo" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payrolls" (
    "id" SERIAL NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "tax_type" "PayrollTaxType" NOT NULL DEFAULT 'PRE_TAX',
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_items" (
    "id" SERIAL NOT NULL,
    "payroll_id" INTEGER NOT NULL,
    "employee_id" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "employee_category" "EmployeeCategory" NOT NULL,
    "employee_name" TEXT NOT NULL,
    "ssn" TEXT,
    "hire_date" DATE,
    "monthly_salary" INTEGER,
    "actual_hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "is_full_attendance" BOOLEAN NOT NULL DEFAULT false,
    "base_pay" INTEGER NOT NULL DEFAULT 0,
    "overtime_pay" INTEGER NOT NULL DEFAULT 0,
    "total_pay" INTEGER NOT NULL DEFAULT 0,
    "tax_amount" INTEGER NOT NULL DEFAULT 0,
    "net_pay" INTEGER NOT NULL DEFAULT 0,
    "work_days" INTEGER NOT NULL DEFAULT 0,
    "off_days" INTEGER NOT NULL DEFAULT 0,
    "week_mode" INTEGER NOT NULL DEFAULT 5,
    "overtime_hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "is_hired" BOOLEAN NOT NULL DEFAULT false,
    "is_retired" BOOLEAN NOT NULL DEFAULT false,
    "item_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_platforms" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "color_code" TEXT NOT NULL DEFAULT '#3B82F6',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_stores" (
    "id" SERIAL NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "platform_id" INTEGER NOT NULL,
    "store_name" TEXT NOT NULL,
    "store_type" "StoreType" NOT NULL DEFAULT 'COMPETITOR',
    "address" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_reviews" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "review_date" DATE NOT NULL,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "rating_avg" DECIMAL(3,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_costs" (
    "id" SERIAL NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "platform_id" INTEGER NOT NULL,
    "store_id" INTEGER NOT NULL,
    "cost_date" DATE NOT NULL,
    "ad_spend" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "order_amount" INTEGER NOT NULL DEFAULT 0,
    "ctr" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "cvr" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "cpc" INTEGER NOT NULL DEFAULT 0,
    "cpa" INTEGER NOT NULL DEFAULT 0,
    "roas" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_exposures" (
    "id" SERIAL NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "region_name" TEXT NOT NULL,
    "exposure_date" DATE NOT NULL,
    "keyword" TEXT,
    "rank" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_exposures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "branches_code_key" ON "branches"("code");

-- CreateIndex
CREATE UNIQUE INDEX "employees_login_id_key" ON "employees"("login_id");

-- CreateIndex
CREATE INDEX "employees_branch_id_idx" ON "employees"("branch_id");

-- CreateIndex
CREATE INDEX "employees_role_status_idx" ON "employees"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "employee_branches_employee_id_branch_id_key" ON "employee_branches"("employee_id", "branch_id");

-- CreateIndex
CREATE INDEX "schedules_branch_id_work_date_idx" ON "schedules"("branch_id", "work_date");

-- CreateIndex
CREATE INDEX "schedules_employee_id_work_date_idx" ON "schedules"("employee_id", "work_date");

-- CreateIndex
CREATE INDEX "memos_branch_id_idx" ON "memos"("branch_id");

-- CreateIndex
CREATE INDEX "attendances_branch_id_attendance_date_idx" ON "attendances"("branch_id", "attendance_date");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_branch_id_employee_id_attendance_date_key" ON "attendances"("branch_id", "employee_id", "attendance_date");

-- CreateIndex
CREATE UNIQUE INDEX "payrolls_branch_id_year_month_key" ON "payrolls"("branch_id", "year", "month");

-- CreateIndex
CREATE INDEX "payroll_items_payroll_id_idx" ON "payroll_items"("payroll_id");

-- CreateIndex
CREATE UNIQUE INDEX "ad_platforms_code_key" ON "ad_platforms"("code");

-- CreateIndex
CREATE INDEX "ad_stores_branch_id_idx" ON "ad_stores"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "ad_reviews_store_id_review_date_key" ON "ad_reviews"("store_id", "review_date");

-- CreateIndex
CREATE INDEX "ad_costs_branch_id_cost_date_idx" ON "ad_costs"("branch_id", "cost_date");

-- CreateIndex
CREATE UNIQUE INDEX "ad_costs_store_id_cost_date_key" ON "ad_costs"("store_id", "cost_date");

-- CreateIndex
CREATE INDEX "ad_exposures_branch_id_exposure_date_idx" ON "ad_exposures"("branch_id", "exposure_date");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_branches" ADD CONSTRAINT "employee_branches_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_branches" ADD CONSTRAINT "employee_branches_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memos" ADD CONSTRAINT "memos_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memos" ADD CONSTRAINT "memos_parent_memo_id_fkey" FOREIGN KEY ("parent_memo_id") REFERENCES "memos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_stores" ADD CONSTRAINT "ad_stores_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_stores" ADD CONSTRAINT "ad_stores_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "ad_platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_reviews" ADD CONSTRAINT "ad_reviews_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "ad_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_costs" ADD CONSTRAINT "ad_costs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_costs" ADD CONSTRAINT "ad_costs_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "ad_platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_costs" ADD CONSTRAINT "ad_costs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "ad_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_exposures" ADD CONSTRAINT "ad_exposures_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
