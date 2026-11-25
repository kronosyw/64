import { NextRequest } from "next/server";
import { EmploymentStatus, PayrollStatus, PayrollTaxType, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureBranch, jsonError, jsonOk, parseBranchId, requireApiOps } from "@/lib/api";
import { aggregateSchedules, calcPayrollItem, resolveCategory } from "@/lib/payroll";

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
      include: { _count: { select: { items: true } }, branch: true },
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

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0));

    const schedules = await prisma.schedule.findMany({
      where: { branchId, workDate: { gte: start, lte: end } },
    });
    const scheduledEmployeeIds = [...new Set(schedules.map((s) => s.employeeId))];

    const employees = await prisma.employee.findMany({
      where: {
        role: { in: [Role.MANAGER, Role.STAFF, Role.PARTTIME] },
        OR: [
          { branchId, status: EmploymentStatus.ACTIVE },
          { id: { in: scheduledEmployeeIds }, branchId },
        ],
      },
    });

    const payroll = await prisma.payroll.upsert({
      where: { branchId_year_month: { branchId, year, month } },
      create: { branchId, year, month, taxType, status: PayrollStatus.DRAFT, memo: body.memo || null },
      update: { taxType, memo: body.memo || null, status: PayrollStatus.DRAFT },
    });

    await prisma.payrollItem.deleteMany({ where: { payrollId: payroll.id } });

    const items = employees.map((emp, idx) => {
      const empSchedules = schedules.filter((s) => s.employeeId === emp.id);
      const agg = aggregateSchedules(empSchedules);
      const category = resolveCategory(emp.role, emp.insuranceType);
      const isPartTimeHourly = emp.role === Role.PARTTIME;
      const monthlySalary = emp.monthlySalary || 0;
      const isHired = Boolean(
        emp.hireDate &&
          emp.hireDate.getUTCFullYear() === year &&
          emp.hireDate.getUTCMonth() + 1 === month,
      );
      const isRetired = emp.status !== EmploymentStatus.ACTIVE;
      const isFullAttendance = agg.workDays > 0 && !isHired && !isRetired;
      const calc = calcPayrollItem({
        category,
        monthlySalary,
        actualHours: agg.actualHours,
        overtimeHours: agg.overtimeHours,
        workDays: agg.workDays,
        weekMode: 5,
        year,
        month,
        taxType,
        isFullAttendance,
        isPartTimeHourly,
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
        actualHours: agg.actualHours,
        overtimeHours: agg.overtimeHours,
        isFullAttendance,
        isHired,
        isRetired,
        workDays: agg.workDays,
        offDays: agg.offDays,
        weekMode: 5,
        ...calc,
      };
    });

    if (items.length) await prisma.payrollItem.createMany({ data: items });

    const full = await prisma.payroll.findUnique({
      where: { id: payroll.id },
      include: { items: { orderBy: { sortOrder: "asc" } }, branch: true },
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

    if (Array.isArray(body.items)) {
      for (const item of body.items) {
        const itemId = Number(item.id);
        if (!itemId) continue;
        const row = await prisma.payrollItem.findFirst({
          where: { id: itemId, payrollId: id },
        });
        if (!row) continue;
        const monthlySalary =
          item.monthlySalary !== undefined ? Number(item.monthlySalary) : Number(row.monthlySalary || 0);
        const actualHours =
          item.actualHours !== undefined ? Number(item.actualHours) : Number(row.actualHours);
        const overtimeHours =
          item.overtimeHours !== undefined ? Number(item.overtimeHours) : Number(row.overtimeHours);
        const workDays = item.workDays !== undefined ? Number(item.workDays) : row.workDays;
        const weekMode = item.weekMode !== undefined ? Number(item.weekMode) : row.weekMode;
        const isFullAttendance =
          item.isFullAttendance !== undefined ? Boolean(item.isFullAttendance) : row.isFullAttendance;
        const category = item.employeeCategory || row.employeeCategory;
        const taxType = (body.taxType as PayrollTaxType) || existing.taxType;
        const isPartTimeHourly = Boolean(item.isPartTimeHourly);
        const calc = calcPayrollItem({
          category,
          monthlySalary,
          actualHours,
          overtimeHours,
          workDays,
          weekMode,
          year: existing.year,
          month: existing.month,
          taxType,
          isFullAttendance,
          isPartTimeHourly,
        });
        await prisma.payrollItem.update({
          where: { id: itemId },
          data: {
            employeeName: item.employeeName !== undefined ? String(item.employeeName) : undefined,
            ssn: item.ssn !== undefined ? item.ssn || null : undefined,
            monthlySalary,
            actualHours,
            overtimeHours,
            workDays,
            weekMode,
            isFullAttendance,
            itemNotes: item.itemNotes !== undefined ? item.itemNotes || null : undefined,
            bankName: item.bankName !== undefined ? item.bankName || null : undefined,
            accountNumber: item.accountNumber !== undefined ? item.accountNumber || null : undefined,
            accountHolder: item.accountHolder !== undefined ? item.accountHolder || null : undefined,
            ...calc,
          },
        });
      }
    }

    const payroll = await prisma.payroll.update({
      where: { id },
      data: {
        status: body.status || undefined,
        memo: body.memo !== undefined ? body.memo : undefined,
        taxType: body.taxType || undefined,
      },
      include: { items: { orderBy: { sortOrder: "asc" } }, branch: true },
    });
    return jsonOk({ payroll });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError(e instanceof Error ? e.message : "급여 수정 실패", 400);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireApiOps();
    const id = Number(req.nextUrl.searchParams.get("id") || (await req.json().catch(() => ({}))).id);
    if (!id) return jsonError("급여 ID가 필요합니다.");
    const existing = await prisma.payroll.findUnique({ where: { id } });
    if (!existing) return jsonError("없음", 404);
    ensureBranch(session.user.branchIds, existing.branchId);
    await prisma.payrollItem.deleteMany({ where: { payrollId: id } });
    await prisma.payroll.delete({ where: { id } });
    return jsonOk({ deleted: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError(e instanceof Error ? e.message : "급여 삭제 실패", 400);
  }
}
