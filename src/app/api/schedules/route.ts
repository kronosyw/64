import { NextRequest } from "next/server";
import { Role, WorkType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureBranch, isStaffRole, jsonError, jsonOk, parseBranchId, requireApiSession } from "@/lib/api";
import { canEditSchedule } from "@/lib/roles";
import { datesInMonthByWeekdays, netWorkHours } from "@/lib/schedule-hours";
import { workTypeForShift } from "@/lib/shifts";

const WORK_TYPES = Object.values(WorkType);

async function shiftForBranch(shiftId: number, branchId: number) {
  const shift = await prisma.branchShift.findUnique({ where: { id: shiftId } });
  if (!shift || shift.branchId !== branchId) return null;
  return shift;
}

async function employeesForBranchSchedule(branchId: number, employeeIds: number[]) {
  return prisma.employee.findMany({
    where: {
      id: { in: employeeIds },
      status: "ACTIVE",
      role: { in: [Role.OWNER, Role.MANAGER, Role.STAFF, Role.PARTTIME] },
      OR: [{ branchId }, { role: Role.OWNER, ownerBranches: { some: { branchId } } }],
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiSession();
    const year = Number(req.nextUrl.searchParams.get("year") || new Date().getFullYear());
    const month = Number(req.nextUrl.searchParams.get("month") || new Date().getMonth() + 1);
    const branchId = parseBranchId(req.nextUrl.searchParams.get("branchId"), session.user.branchIds);
    if (!branchId) return jsonError("접근 가능한 지점이 없습니다.", 403);

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0));

    const schedules = await prisma.schedule.findMany({
      where: {
        branchId,
        workDate: { gte: start, lte: end },
      },
      include: { shift: { select: { color: true, isOff: true } } },
      orderBy: [{ workDate: "asc" }, { startTime: "asc" }, { employeeName: "asc" }],
    });

    return jsonOk({ schedules, branchId, canEdit: canEditSchedule(session.user.role) });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("일정 조회 실패", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiSession();
    if (!canEditSchedule(session.user.role) || isStaffRole(session.user.role)) {
      return jsonError("일정 편집 권한이 없습니다.", 403);
    }

    const body = await req.json();
    const branchId = Number(body.branchId);
    ensureBranch(session.user.branchIds, branchId);

    if (body.action === "bulk") {
      const year = Number(body.year);
      const month = Number(body.month);
      const employeeIds = Array.isArray(body.employeeIds)
        ? body.employeeIds.map((n: unknown) => Number(n)).filter((n: number) => Number.isFinite(n) && n > 0)
        : [];
      const weekdays = Array.isArray(body.weekdays)
        ? body.weekdays.map((n: unknown) => Number(n)).filter((n: number) => n >= 0 && n <= 6)
        : [];
      const breakMinutes = Number(body.breakMinutes || 0);
      const replaceExisting = Boolean(body.replaceExisting);
      const dayTimes = (body.dayTimes || {}) as Record<string, { startTime?: string; endTime?: string }>;

      if (!year || !month || !employeeIds.length || !weekdays.length) {
        return jsonError("직원, 요일, 연월을 확인하세요.");
      }

      const employees = await employeesForBranchSchedule(branchId, employeeIds);
      if (!employees.length) return jsonError("근무 가능한 인원이 없습니다.");

      const shift = body.shiftId ? await shiftForBranch(Number(body.shiftId), branchId) : null;
      if (body.shiftId && !shift) return jsonError("이 지점의 근무형태가 아닙니다.");
      if (shift?.isOff) return jsonError("휴무 근무형태로는 일괄 등록할 수 없습니다.");

      const dates = datesInMonthByWeekdays(year, month, weekdays);
      if (!dates.length) return jsonError("선택한 요일이 해당 월에 없습니다.");

      const rows: Array<{
        branchId: number;
        employeeId: number;
        employeeName: string;
        workType: WorkType;
        shiftId: number | null;
        shiftName: string | null;
        workDate: Date;
        startTime: string;
        endTime: string;
        workHours: number;
        createdBy: string | null | undefined;
        updatedBy: string | null | undefined;
      }> = [];

      for (const date of dates) {
        const dow = new Date(`${date}T00:00:00.000Z`).getUTCDay();
        const times = dayTimes[String(dow)] || {};
        const startTime = String(times.startTime || body.startTime || shift?.startTime || "").trim();
        const endTime = String(times.endTime || body.endTime || shift?.endTime || "").trim();
        if (!startTime || !endTime) {
          return jsonError(`${["일", "월", "화", "수", "목", "금", "토"][dow]}요일 시간을 입력하세요.`);
        }
        const workHours = netWorkHours(startTime, endTime, breakMinutes);
        const workType = shift ? workTypeForShift(shift) : WorkType.OPEN;

        for (const employee of employees) {
          rows.push({
            branchId,
            employeeId: employee.id,
            employeeName: employee.name,
            workType,
            shiftId: shift?.id ?? null,
            shiftName: shift?.name ?? null,
            workDate: new Date(`${date}T00:00:00.000Z`),
            startTime,
            endTime,
            workHours,
            createdBy: session.user.name,
            updatedBy: session.user.name,
          });
        }
      }

      if (replaceExisting) {
        await prisma.schedule.deleteMany({
          where: {
            branchId,
            employeeId: { in: employees.map((e) => e.id) },
            workDate: { in: dates.map((d) => new Date(`${d}T00:00:00.000Z`)) },
          },
        });
      }

      const created = await prisma.schedule.createMany({ data: rows });
      return jsonOk({
        created: created.count,
        days: dates.length,
        people: employees.length,
        message: `${employees.length}명 × ${dates.length}일, ${created.count}건 등록했습니다.`,
      }, 201);
    }

    const employeeId = Number(body.employeeId);
    const workDate = String(body.workDate || "");
    if (!employeeId || !workDate) return jsonError("필수값이 없습니다.");

    const shift = body.shiftId ? await shiftForBranch(Number(body.shiftId), branchId) : null;
    const legacyType = body.workType as WorkType;
    if (!shift && !WORK_TYPES.includes(legacyType)) return jsonError("근무형태를 선택하세요.");

    const employees = await employeesForBranchSchedule(branchId, [employeeId]);
    const employee = employees[0];
    if (!employee) return jsonError("이 지점에서 근무할 수 없는 인원입니다.", 404);

    const workType = shift ? workTypeForShift(shift) : legacyType;
    const off = workType === WorkType.OFF;
    const startTime = off ? null : body.startTime || shift?.startTime || null;
    const endTime = off ? null : body.endTime || shift?.endTime || null;
    const breakMinutes = Number(body.breakMinutes || 0);
    const workHours = off
      ? null
      : body.workHours != null && body.workHours !== ""
        ? Number(body.workHours)
        : netWorkHours(startTime, endTime, breakMinutes);

    const schedule = await prisma.schedule.create({
      data: {
        branchId,
        employeeId,
        employeeName: employee.name,
        workType,
        shiftId: shift?.id ?? null,
        shiftName: shift?.name ?? null,
        workDate: new Date(workDate),
        startTime,
        endTime,
        workHours,
        createdBy: session.user.name,
        updatedBy: session.user.name,
      },
    });
    return jsonOk({ schedule }, 201);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError(e instanceof Error ? e.message : "일정 등록 실패", 400);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireApiSession();
    if (!canEditSchedule(session.user.role)) return jsonError("일정 편집 권한이 없습니다.", 403);
    const body = await req.json();
    const id = Number(body.id);
    const existing = await prisma.schedule.findUnique({ where: { id } });
    if (!existing) return jsonError("일정이 없습니다.", 404);
    ensureBranch(session.user.branchIds, existing.branchId);

    const shift = body.shiftId ? await shiftForBranch(Number(body.shiftId), existing.branchId) : null;
    if (body.shiftId && !shift) return jsonError("이 지점의 근무형태가 아닙니다.");

    let employeeId = existing.employeeId;
    let employeeName = existing.employeeName;
    if (body.employeeId) {
      const employees = await employeesForBranchSchedule(existing.branchId, [Number(body.employeeId)]);
      const employee = employees[0];
      if (!employee) return jsonError("이 지점에서 근무할 수 없는 인원입니다.", 404);
      employeeId = employee.id;
      employeeName = employee.name;
    }

    const workType = shift ? workTypeForShift(shift) : ((body.workType as WorkType) || existing.workType);
    if (!WORK_TYPES.includes(workType)) return jsonError("잘못된 근무유형입니다.");
    const off = workType === WorkType.OFF;
    const startTime = off ? null : (body.startTime ?? shift?.startTime ?? existing.startTime);
    const endTime = off ? null : (body.endTime ?? shift?.endTime ?? existing.endTime);
    const breakMinutes = body.breakMinutes !== undefined ? Number(body.breakMinutes || 0) : undefined;
    const workHours = off
      ? null
      : body.workHours !== undefined
        ? Number(body.workHours)
        : breakMinutes !== undefined
          ? netWorkHours(startTime, endTime, breakMinutes)
          : existing.workHours;

    const schedule = await prisma.schedule.update({
      where: { id },
      data: {
        employeeId,
        employeeName,
        workType,
        shiftId: shift ? shift.id : body.shiftId === null ? null : existing.shiftId,
        shiftName: shift ? shift.name : existing.shiftName,
        workDate: body.workDate ? new Date(String(body.workDate)) : existing.workDate,
        startTime,
        endTime,
        workHours,
        updatedBy: session.user.name,
      },
    });
    return jsonOk({ schedule });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("일정 수정 실패", 400);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireApiSession();
    if (!canEditSchedule(session.user.role)) return jsonError("일정 편집 권한이 없습니다.", 403);
    const id = Number(req.nextUrl.searchParams.get("id"));
    const existing = await prisma.schedule.findUnique({ where: { id } });
    if (!existing) return jsonError("일정이 없습니다.", 404);
    ensureBranch(session.user.branchIds, existing.branchId);
    await prisma.schedule.delete({ where: { id } });
    return jsonOk({ message: "삭제되었습니다." });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("일정 삭제 실패", 400);
  }
}
