import { NextRequest } from "next/server";
import { WorkType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureBranch, isStaffRole, jsonError, jsonOk, parseBranchId, requireApiSession } from "@/lib/api";
import { canEditSchedule } from "@/lib/roles";
import { workTypeForShift } from "@/lib/shifts";

const WORK_TYPES = Object.values(WorkType);

async function shiftForBranch(shiftId: number, branchId: number) {
  const shift = await prisma.branchShift.findUnique({ where: { id: shiftId } });
  if (!shift || shift.branchId !== branchId) return null;
  return shift;
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
    const employeeId = Number(body.employeeId);
    const workDate = String(body.workDate || "");
    ensureBranch(session.user.branchIds, branchId);
    if (!employeeId || !workDate) return jsonError("필수값이 없습니다.");

    const shift = body.shiftId ? await shiftForBranch(Number(body.shiftId), branchId) : null;
    const legacyType = body.workType as WorkType;
    if (!shift && !WORK_TYPES.includes(legacyType)) return jsonError("근무형태를 선택하세요.");

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return jsonError("직원이 없습니다.", 404);

    const workType = shift ? workTypeForShift(shift) : legacyType;
    const off = workType === WorkType.OFF;
    const schedule = await prisma.schedule.create({
      data: {
        branchId,
        employeeId,
        employeeName: employee.name,
        workType,
        shiftId: shift?.id ?? null,
        shiftName: shift?.name ?? null,
        workDate: new Date(workDate),
        startTime: off ? null : body.startTime || shift?.startTime || null,
        endTime: off ? null : body.endTime || shift?.endTime || null,
        workHours: body.workHours ? Number(body.workHours) : null,
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
      const employee = await prisma.employee.findUnique({ where: { id: Number(body.employeeId) } });
      if (!employee) return jsonError("직원이 없습니다.", 404);
      employeeId = employee.id;
      employeeName = employee.name;
    }

    const workType = shift ? workTypeForShift(shift) : ((body.workType as WorkType) || existing.workType);
    if (!WORK_TYPES.includes(workType)) return jsonError("잘못된 근무유형입니다.");
    const off = workType === WorkType.OFF;
    const schedule = await prisma.schedule.update({
      where: { id },
      data: {
        employeeId,
        employeeName,
        workType,
        shiftId: shift ? shift.id : body.shiftId === null ? null : existing.shiftId,
        shiftName: shift ? shift.name : existing.shiftName,
        workDate: body.workDate ? new Date(String(body.workDate)) : existing.workDate,
        startTime: off ? null : (body.startTime ?? shift?.startTime ?? existing.startTime),
        endTime: off ? null : (body.endTime ?? shift?.endTime ?? existing.endTime),
        workHours: body.workHours !== undefined ? Number(body.workHours) : existing.workHours,
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
