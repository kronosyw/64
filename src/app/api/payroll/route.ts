import { NextRequest } from "next/server";
import { EmployeeCategory, PayrollStatus, PayrollTaxType, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureBranch, jsonError, jsonOk, parseBranchId, requireApiOps } from "@/lib/api";
import { calcPayrollItem } from "@/lib/payroll";

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiOps();
    const branchId = parseBranchId(req.nextUrl.searchParams.get("branchId"), session.user.branchIds);
    if (!branchId) return jsonError("지점 없음", 403);
    const id = req.nextUrl.searchParams.get("id");

    if (id) {
      const payroll = await prisma.payroll.findUnique({
        where: { id: Number(id) },
        include: { items: { orderBy: { sortOrder: "asc" } }, branch: true },
      });
      if (!payroll || !session.user.branchIds.includes(payroll.branchId)) {
        return jsonError("없음", 404);
      }
      return jsonOk({ payroll });
    }

    const list = await prisma.payroll.findMany({
      where: { branchId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: { _count: { select: { items: true } } },
    });
    return jsonOk({ payrolls: list, branchId });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("급여 조회 실패", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiOps();
    const body = await req.json();
    const branchId = Number(body.branchId);
    ensureBranch(session.user.branchIds, branchId);
    const year = Number(body.year);
    const month = Number(body.month);
    const taxType = (body.taxType as PayrollTaxType) || PayrollTaxType.PRE_TAX;

    const employees = await prisma.employee.findMany({
      where: {
        branchId,
        status: "ACTIVE",
        role: { in: [Role.MANAGER, Role.STAFF, Role.PARTTIME] },
      },
    });

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0));
    const schedules = await prisma.schedule.findMany({
      where: { branchId, workDate: { gte: start, lte: end } },
    });

    const payroll = await prisma.payroll.upsert({
      where: { branchId_year_month: { branchId, year, month } },
      create: { branchId, year, month, taxType, status: PayrollStatus.DRAFT, memo: body.memo || null },
      update: { taxType, memo: body.memo || null },
    });

    await prisma.payrollItem.deleteMany({ where: { payrollId: payroll.id } });

    const items = employees.map((emp, idx) => {
      const empSchedules = schedules.filter((s) => s.employeeId === emp.id);
      const actualHours = empSchedules.reduce((sum, s) => sum + Number(s.workHours || 0), 0);
      const offDays = empSchedules.filter((s) => s.workType === "OFF").length;
      const workDays = empSchedules.filter((s) => s.workType !== "OFF").length;
      const category =
        emp.role === Role.PARTTIME
          ? EmployeeCategory.BUSINESS_INCOME_33
          : emp.insuranceType === "THREE_POINT_THREE"
            ? EmployeeCategory.BUSINESS_INCOME_33
            : EmployeeCategory.FULL_TIME_4INS;
      const monthlySalary = emp.monthlySalary || 0;
      const calc = calcPayrollItem({
        category,
        monthlySalary,
        actualHours,
        overtimeHours: 0,
        workDays,
        taxType,
        isFullAttendance: offDays <= 2 && workDays >= 20,
      });

      return {
        payrollId: payroll.id,
        employeeId: emp.id,
        sortOrder: idx,
        employeeCategory: category,
        employeeName: emp.name,
        ssn: emp.ssn,
        hireDate: emp.hireDate,
        bankName: emp.bankName,
        accountNumber: emp.accountNumber,
        accountHolder: emp.accountHolder,
        monthlySalary,
        actualHours,
        isFullAttendance: offDays <= 2 && workDays >= 20,
        workDays,
        offDays,
        ...calc,
      };
    });

    if (items.length) await prisma.payrollItem.createMany({ data: items });

    const full = await prisma.payroll.findUnique({
      where: { id: payroll.id },
      include: { items: true },
    });
    return jsonOk({ payroll: full });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError(e instanceof Error ? e.message : "급여 생성 실패", 400);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireApiOps();
    const body = await req.json();
    const id = Number(body.id);
    const existing = await prisma.payroll.findUnique({ where: { id } });
    if (!existing) return jsonError("없음", 404);
    ensureBranch(session.user.branchIds, existing.branchId);

    const payroll = await prisma.payroll.update({
      where: { id },
      data: {
        status: body.status || undefined,
        memo: body.memo !== undefined ? body.memo : undefined,
        taxType: body.taxType || undefined,
      },
    });
    return jsonOk({ payroll });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("급여 수정 실패", 400);
  }
}
