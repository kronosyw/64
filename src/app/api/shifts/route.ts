import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureBranch, jsonError, jsonOk, parseBranchId, requireApiSession } from "@/lib/api";
import { canEditSchedule } from "@/lib/roles";
import { cleanClock, cleanShiftColor } from "@/lib/shift-options";

function deny(role: string) {
  if (!canEditSchedule(role)) {
    return jsonError("근무형태는 최고관리자, 사장, 지점장만 수정할 수 있습니다.", 403);
  }
  return null;
}

function readShift(body: Record<string, unknown>):
  | { error: string }
  | { data: { name: string; isOff: boolean; startTime: string | null; endTime: string | null; color: string } } {
  const name = String(body.name ?? "").trim();
  if (!name || name.length > 20) return { error: "근무형태 이름을 20자 이내로 입력하세요." };
  const isOff = Boolean(body.isOff);
  const startTime = isOff ? null : cleanClock(body.startTime);
  const endTime = isOff ? null : cleanClock(body.endTime);
  if (!isOff && (!startTime || !endTime)) return { error: "시작과 종료 시간을 입력하세요." };
  if (!isOff && startTime && endTime && startTime >= endTime) return { error: "종료 시간은 시작보다 뒤여야 합니다." };
  return {
    data: {
      name,
      isOff,
      startTime,
      endTime,
      color: cleanShiftColor(body.color),
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiSession();
    const branchId = parseBranchId(req.nextUrl.searchParams.get("branchId"), session.user.branchIds);
    if (!branchId) return jsonError("접근 가능한 지점이 없습니다.", 403);

    const shifts = await prisma.branchShift.findMany({
      where: { branchId },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
    return jsonOk({ shifts, branchId, canEdit: canEditSchedule(session.user.role) });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("근무형태 조회 실패", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiSession();
    const denied = deny(session.user.role);
    if (denied) return denied;

    const body = await req.json();
    const branchId = Number(body.branchId);
    ensureBranch(session.user.branchIds, branchId);
    const parsed = readShift(body);
    if ("error" in parsed) return jsonError(parsed.error);

    const last = await prisma.branchShift.findFirst({
      where: { branchId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const shift = await prisma.branchShift.create({
      data: { branchId, ...parsed.data, sortOrder: (last?.sortOrder ?? -1) + 1 },
    });
    return jsonOk({ shift }, 201);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError(e instanceof Error ? e.message : "근무형태 등록 실패", 400);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireApiSession();
    const denied = deny(session.user.role);
    if (denied) return denied;

    const body = await req.json();
    const id = Number(body.id);
    const existing = await prisma.branchShift.findUnique({ where: { id } });
    if (!existing) return jsonError("근무형태가 없습니다.", 404);
    ensureBranch(session.user.branchIds, existing.branchId);

    const parsed = readShift({ ...existing, ...body, isOff: body.isOff ?? existing.isOff });
    if ("error" in parsed) return jsonError(parsed.error);

    const shift = await prisma.branchShift.update({
      where: { id },
      data: parsed.data,
    });
    await prisma.schedule.updateMany({
      where: { shiftId: id },
      data: { shiftName: shift.name },
    });
    return jsonOk({ shift });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("근무형태 수정 실패", 400);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireApiSession();
    const denied = deny(session.user.role);
    if (denied) return denied;

    const id = Number(req.nextUrl.searchParams.get("id"));
    const existing = await prisma.branchShift.findUnique({ where: { id } });
    if (!existing) return jsonError("근무형태가 없습니다.", 404);
    ensureBranch(session.user.branchIds, existing.branchId);
    await prisma.branchShift.delete({ where: { id } });
    return jsonOk({ message: "삭제되었습니다." });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("근무형태 삭제 실패", 400);
  }
}
