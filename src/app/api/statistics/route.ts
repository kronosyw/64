import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, parseBranchId, requireApiOps } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiOps();
    const branchId = parseBranchId(req.nextUrl.searchParams.get("branchId"), session.user.branchIds);
    if (!branchId) return jsonError("지점 없음", 403);
    const year = Number(req.nextUrl.searchParams.get("year") || new Date().getFullYear());
    const month = Number(req.nextUrl.searchParams.get("month") || new Date().getMonth() + 1);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0));

    const schedules = await prisma.schedule.findMany({
      where: { branchId, workDate: { gte: start, lte: end } },
    });

    const byEmployee = new Map<
      number,
      { employeeId: number; name: string; workDays: number; offDays: number; hours: number }
    >();

    for (const s of schedules) {
      const cur = byEmployee.get(s.employeeId) || {
        employeeId: s.employeeId,
        name: s.employeeName,
        workDays: 0,
        offDays: 0,
        hours: 0,
      };
      if (s.workType === "OFF") cur.offDays += 1;
      else cur.workDays += 1;
      cur.hours += Number(s.workHours || 0);
      byEmployee.set(s.employeeId, cur);
    }

    return jsonOk({
      branchId,
      year,
      month,
      totals: {
        scheduleCount: schedules.length,
        employeeCount: byEmployee.size,
        totalHours: [...byEmployee.values()].reduce((a, b) => a + b.hours, 0),
      },
      employees: [...byEmployee.values()].sort((a, b) => a.name.localeCompare(b.name, "ko")),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("통계 조회 실패", 500);
  }
}
