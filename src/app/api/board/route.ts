import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureBranch, jsonError, jsonOk, requireApiSession } from "@/lib/api";

type VisiblePost = {
  id: number;
  authorId: number;
  isAll: boolean;
  branches: { branchId: number }[];
};

function canEditPost(role: string, userId: string, branchIds: number[], post: VisiblePost) {
  if (role === "SUPERADMIN") return true;
  if (String(post.authorId) === userId) return true;
  if (role === "OWNER") return post.isAll || post.branches.some((row) => branchIds.includes(row.branchId));
  if (role === "MANAGER") return !post.isAll && post.branches.some((row) => branchIds.includes(row.branchId));
  return false;
}

function readPostBody(
  body: Record<string, unknown>,
  allowedBranchIds: number[],
): { error: string } | { data: { title: string; content: string; isNotice: boolean; isAll: boolean; branchIds: number[] } } {
  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();
  const isNotice = Boolean(body.isNotice);
  const isAll = Boolean(body.isAll);
  const requested = Array.isArray(body.branchIds) ? body.branchIds.map((id) => Number(id)) : [];
  const branchIds = [...new Set(requested.filter((id) => allowedBranchIds.includes(id)))];
  if (!title || title.length > 80) return { error: "제목은 80자 이내로 입력하세요." };
  if (!content || content.length > 4000) return { error: "내용은 4000자 이내로 입력하세요." };
  if (!isAll && branchIds.length === 0) return { error: "볼 수 있는 지점을 선택하거나 전체로 지정하세요." };
  return { data: { title, content, isNotice, isAll, branchIds } };
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiSession();
    const branches = await prisma.branch.findMany({
      where: { id: { in: session.user.branchIds }, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    const requested = Number(req.nextUrl.searchParams.get("branchId"));
    const branchId = branches.some((branch) => branch.id === requested) ? requested : (branches[0]?.id ?? null);
    if (!branchId) return jsonOk({ branches, branchId: null, posts: [] });
    ensureBranch(session.user.branchIds, branchId);

    const rows = await prisma.boardPost.findMany({
      where: {
        OR: [{ isAll: true }, { branches: { some: { branchId } } }],
      },
      include: { branches: { include: { branch: { select: { id: true, name: true } } } } },
      orderBy: [{ isNotice: "desc" }, { createdAt: "desc" }],
    });

    return jsonOk({
      branches,
      branchId,
      posts: rows.map((post) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        isNotice: post.isNotice,
        isAll: post.isAll,
        authorName: post.authorName,
        createdAt: post.createdAt,
        branchIds: post.branches.map((row) => row.branchId),
        branchNames: post.branches.map((row) => row.branch.name),
        canEdit: canEditPost(session.user.role, session.user.id, session.user.branchIds, post),
      })),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("게시글 조회 실패", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiSession();
    const body = await req.json();
    const parsed = readPostBody(body, session.user.branchIds);
    if ("error" in parsed) return jsonError(parsed.error);

    const post = await prisma.boardPost.create({
      data: {
        title: parsed.data.title,
        content: parsed.data.content,
        isNotice: parsed.data.isNotice,
        isAll: parsed.data.isAll,
        authorId: Number(session.user.id),
        authorName: session.user.name,
        branches: parsed.data.isAll
          ? undefined
          : { create: parsed.data.branchIds.map((branchId) => ({ branchId })) },
      },
    });
    return jsonOk({ post }, 201);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError(e instanceof Error ? e.message : "게시글 등록 실패", 400);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireApiSession();
    const body = await req.json();
    const id = Number(body.id);
    const existing = await prisma.boardPost.findUnique({
      where: { id },
      include: { branches: true },
    });
    if (!existing) return jsonError("글이 없습니다.", 404);
    if (!canEditPost(session.user.role, session.user.id, session.user.branchIds, existing)) {
      return jsonError("수정 권한이 없습니다.", 403);
    }

    const parsed = readPostBody(body, session.user.branchIds);
    if ("error" in parsed) return jsonError(parsed.error);
    const hidden = existing.branches.map((row) => row.branchId).filter((branchId) => !session.user.branchIds.includes(branchId));
    const branchIds = parsed.data.isAll ? [] : [...new Set([...parsed.data.branchIds, ...hidden])];

    await prisma.boardPostBranch.deleteMany({ where: { postId: id } });
    const post = await prisma.boardPost.update({
      where: { id },
      data: {
        title: parsed.data.title,
        content: parsed.data.content,
        isNotice: parsed.data.isNotice,
        isAll: parsed.data.isAll,
        branches: branchIds.length ? { create: branchIds.map((branchId) => ({ branchId })) } : undefined,
      },
    });
    return jsonOk({ post });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("게시글 수정 실패", 400);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireApiSession();
    const id = Number(req.nextUrl.searchParams.get("id"));
    const existing = await prisma.boardPost.findUnique({
      where: { id },
      include: { branches: true },
    });
    if (!existing) return jsonError("글이 없습니다.", 404);
    if (!canEditPost(session.user.role, session.user.id, session.user.branchIds, existing)) {
      return jsonError("삭제 권한이 없습니다.", 403);
    }
    await prisma.boardPost.delete({ where: { id } });
    return jsonOk({ message: "삭제되었습니다." });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("게시글 삭제 실패", 400);
  }
}
