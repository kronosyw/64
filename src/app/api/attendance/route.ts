import { NextRequest } from "next/server";
import { AttendanceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureBranch, jsonError, jsonOk, parseBranchId, requireApiOps } from "@/lib/api";

function minutesDiff(scheduled?: string | null, actual?: string | null) {
  if (!scheduled || !actual) return 0;
  const [sh, sm] = scheduled.split(":").map(Number);
  const [ah, am] = actual.split(":").map(Number);
  return ah * 60 + am - (sh * 60 + sm);
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiOps();
    const branchId = parseBranchId(req.nextUrl.searchParams.get("branchId"), session.user.branchIds);
    if (!branchId) return jsonError("지점 없음", 403);
    const year = Number(req.nextUrl.searchParams.get("year") || new Date().getFullYear());
    const month = Number(req.nextUrl.searchParams.get("month") || new Date().getMonth() + 1);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0));

    const rows = await prisma.attendance.findMany({
      where: { branchId, attendanceDate: { gte: start, lte: end } },
      orderBy: [{ attendanceDate: "desc" }, { employeeName: "asc" }],
    });
    return jsonOk({ attendances: rows, branchId });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("근태 조회 실패", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiOps();
    const body = await req.json();
    const branchId = Number(body.branchId);
    ensureBranch(session.user.branchIds, branchId);
    const employeeId = Number(body.employeeId);
    const attendanceDate = String(body.attendanceDate || "");
    if (!employeeId || !attendanceDate) return jsonError("필수값 누락");

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return jsonError("직원 없음", 404);

    let status = (body.status as AttendanceStatus) || AttendanceStatus.NORMAL;
    const late = Math.max(0, minutesDiff(body.scheduledStartTime, body.actualStartTime));
    const early = Math.max(0, -minutesDiff(body.scheduledEndTime, body.actualEndTime));
    if (status === AttendanceStatus.NORMAL && late > 0) status = AttendanceStatus.LATE;
    if (status === AttendanceStatus.NORMAL && early > 0) status = AttendanceStatus.EARLY_LEAVE;

    const attendance = await prisma.attendance.upsert({
      where: {
        branchId_employeeId_attendanceDate: {
          branchId,
          employeeId,
          attendanceDate: new Date(attendanceDate),
        },
      },
      create: {
        branchId,
        employeeId,
        employeeName: employee.name,
        attendanceDate: new Date(attendanceDate),
        scheduledStartTime: body.scheduledStartTime || null,
        scheduledEndTime: body.scheduledEndTime || null,
        actualStartTime: body.actualStartTime || null,
        actualEndTime: body.actualEndTime || null,
        status,
        lateMinutes: late,
        earlyLeaveMinutes: early,
        absenceReason: body.absenceReason || null,
        workType: body.workType || null,
        memo: body.memo || null,
        createdBy: session.user.name,
      },
      update: {
        scheduledStartTime: body.scheduledStartTime || null,
        scheduledEndTime: body.scheduledEndTime || null,
        actualStartTime: body.actualStartTime || null,
        actualEndTime: body.actualEndTime || null,
        status,
        lateMinutes: late,
        earlyLeaveMinutes: early,
        absenceReason: body.absenceReason || null,
        workType: body.workType || null,
        memo: body.memo || null,
      },
    });
    return jsonOk({ attendance });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError(e instanceof Error ? e.message : "근태 저장 실패", 400);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireApiOps();
    const id = Number(req.nextUrl.searchParams.get("id"));
    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing) return jsonError("없음", 404);
    ensureBranch(session.user.branchIds, existing.branchId);
    await prisma.attendance.delete({ where: { id } });
    return jsonOk({ message: "삭제됨" });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("삭제 실패", 400);
  }
}
