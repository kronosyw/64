import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureBranch, jsonError, jsonOk, parseBranchId, requireApiMemo } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiMemo();
    const branchId = parseBranchId(req.nextUrl.searchParams.get("branchId"), session.user.branchIds);
    if (!branchId) return jsonError("지점 없음", 403);
    const showCompleted = req.nextUrl.searchParams.get("showCompleted") === "1";

    const memos = await prisma.memo.findMany({
      where: {
        branchId,
        parentMemoId: null,
        ...(showCompleted ? {} : { isCompleted: false }),
      },
      include: { replies: { orderBy: { createdAt: "asc" } } },
      orderBy: [{ isImportant: "desc" }, { createdAt: "desc" }],
    });
    return jsonOk({ memos });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("메모 조회 실패", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiMemo();
    const body = await req.json();
    const branchId = Number(body.branchId);
    ensureBranch(session.user.branchIds, branchId);
    const content = String(body.content ?? "").trim();
    if (!content) return jsonError("내용을 입력하세요.");

    const memo = await prisma.memo.create({
      data: {
        branchId,
        content,
        author: session.user.name,
        isImportant: Boolean(body.isImportant),
        parentMemoId: body.parentMemoId ? Number(body.parentMemoId) : null,
      },
    });
    return jsonOk({ memo }, 201);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("메모 등록 실패", 400);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireApiMemo();
    const body = await req.json();
    const id = Number(body.id);
    const existing = await prisma.memo.findUnique({ where: { id } });
    if (!existing) return jsonError("메모 없음", 404);
    ensureBranch(session.user.branchIds, existing.branchId);

    const memo = await prisma.memo.update({
      where: { id },
      data: {
        content: body.content !== undefined ? String(body.content).trim() : undefined,
        isImportant: body.isImportant !== undefined ? Boolean(body.isImportant) : undefined,
        isCompleted: body.isCompleted !== undefined ? Boolean(body.isCompleted) : undefined,
      },
    });
    return jsonOk({ memo });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("메모 수정 실패", 400);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireApiMemo();
    const id = Number(req.nextUrl.searchParams.get("id"));
    const existing = await prisma.memo.findUnique({ where: { id } });
    if (!existing) return jsonError("메모 없음", 404);
    ensureBranch(session.user.branchIds, existing.branchId);
    await prisma.memo.delete({ where: { id } });
    return jsonOk({ message: "삭제되었습니다." });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("메모 삭제 실패", 400);
  }
}
