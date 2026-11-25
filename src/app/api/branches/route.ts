import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { ensureBranch, jsonError, jsonOk, requireApiOps, requireApiOwner } from "@/lib/api";
import { shiftRowsForBranch } from "@/lib/shift-options";

export async function GET() {
  try {
    const session = await requireApiOps();
    const seeAll = session.user.role === Role.SUPERADMIN;
    const branches = await prisma.branch.findMany({
      where: seeAll ? {} : { id: { in: session.user.branchIds }, isActive: true },
      orderBy: { name: "asc" },
    });
    return jsonOk({ branches });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("지점 조회 실패", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiOwner();
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const code = body.code ? String(body.code).trim() : null;
    const address = body.address ? String(body.address).trim() : null;
    const phone = body.phone ? String(body.phone).trim() : null;
    if (!name) return jsonError("지점명은 필수입니다.");

    const branch = await prisma.branch.create({
      data: { name, code, address, phone, isActive: true },
    });

    await prisma.employeeBranch.create({
      data: { employeeId: Number(session.user.id), branchId: branch.id },
    });
    await prisma.branchShift.createMany({ data: shiftRowsForBranch(branch.id) });

    return jsonOk({ branch }, 201);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError(e instanceof Error ? e.message : "지점 등록 실패", 400);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireApiOwner();
    const body = await req.json();
    const id = Number(body.id);
    if (!id) return jsonError("지점 ID가 필요합니다.");

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        name: body.name !== undefined ? String(body.name).trim() : undefined,
        code: body.code !== undefined ? (body.code ? String(body.code).trim() : null) : undefined,
        address: body.address !== undefined ? (body.address ? String(body.address).trim() : null) : undefined,
        phone: body.phone !== undefined ? (body.phone ? String(body.phone).trim() : null) : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      },
    });
    return jsonOk({ branch });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError(e instanceof Error ? e.message : "지점 수정 실패", 400);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireApiOwner();
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!id) return jsonError("지점 ID가 필요합니다.");
    ensureBranch(session.user.branchIds, id);
    await prisma.branch.update({ where: { id }, data: { isActive: false } });
    return jsonOk({ message: "비활성화되었습니다." });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("지점 비활성화 실패", 400);
  }
}
