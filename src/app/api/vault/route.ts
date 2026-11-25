import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureBranch, jsonError, jsonOk, requireApiVault } from "@/lib/api";
import { canViewAllVault, readUploadFiles } from "@/lib/vault";

const fileSelect = {
  id: true,
  fileName: true,
  mimeType: true,
  size: true,
  kind: true,
  createdAt: true,
} as const;

function serializeRecord(record: {
  id: number;
  branchId: number;
  title: string;
  content: string | null;
  authorId: number | null;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
  branch?: { id: number; name: string } | null;
  files: Array<{
    id: number;
    fileName: string;
    mimeType: string;
    size: number;
    kind: string;
    createdAt: Date;
  }>;
}) {
  return {
    ...record,
    branchName: record.branch?.name ?? null,
    files: record.files.map((file) => ({
      id: file.id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      size: file.size,
      kind: file.kind,
      createdAt: file.createdAt,
      url: `/api/vault/file?id=${file.id}`,
    })),
  };
}

function ownerScope(branchIds: number[]): Prisma.InfoRecordWhereInput {
  return { branchId: { in: branchIds } };
}

function assertRecordAccess(
  role: string,
  branchIds: number[],
  record: { branchId: number },
) {
  if (canViewAllVault(role)) return;
  if (!branchIds.includes(record.branchId)) {
    throw new Response(JSON.stringify({ success: false, message: "권한이 없습니다." }), { status: 403 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiVault();
    const id = req.nextUrl.searchParams.get("id");
    const q = req.nextUrl.searchParams.get("q")?.trim();
    const all = canViewAllVault(session.user.role);
    const branchIds = session.user.branchIds;

    if (!all && !branchIds.length) return jsonOk({ records: [], branches: [] });

    const scope = all ? {} : ownerScope(branchIds);
    const search: Prisma.InfoRecordWhereInput | undefined = q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined;

    if (id) {
      const record = await prisma.infoRecord.findUnique({
        where: { id: Number(id) },
        include: {
          branch: { select: { id: true, name: true } },
          files: { select: fileSelect, orderBy: { id: "asc" } },
        },
      });
      if (!record) return jsonError("없음", 404);
      assertRecordAccess(session.user.role, branchIds, record);
      return jsonOk({ record: serializeRecord(record) });
    }

    const records = await prisma.infoRecord.findMany({
      where: { AND: [scope, search].filter(Boolean) as Prisma.InfoRecordWhereInput[] },
      include: {
        branch: { select: { id: true, name: true } },
        files: { select: fileSelect, orderBy: { id: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const branches = all
      ? await prisma.branch.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : await prisma.branch.findMany({
          where: { id: { in: branchIds }, isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        });

    return jsonOk({ records: records.map(serializeRecord), branches });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("정보 조회 실패", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiVault();
    const form = await req.formData();
    const title = String(form.get("title") || "").trim();
    const content = String(form.get("content") || "").trim();
    const branchId = Number(form.get("branchId"));
    if (!title) return jsonError("항목 이름이 필요합니다.");
    if (!branchId) return jsonError("지점을 선택하세요.");

    if (canViewAllVault(session.user.role)) {
      const branch = await prisma.branch.findUnique({ where: { id: branchId } });
      if (!branch) return jsonError("지점이 없습니다.", 404);
    } else {
      ensureBranch(session.user.branchIds, branchId);
    }

    let files;
    try {
      files = await readUploadFiles(form, "files");
    } catch (err) {
      return jsonError(err instanceof Error ? err.message : "파일 업로드 실패");
    }

    const record = await prisma.infoRecord.create({
      data: {
        branchId,
        title,
        content: content || null,
        authorId: Number(session.user.id) || null,
        authorName: session.user.name || session.user.loginId || "관리자",
        files: files.length
          ? {
              create: files.map((file) => ({
                fileName: file.fileName,
                mimeType: file.mimeType,
                size: file.size,
                kind: file.kind,
                data: new Uint8Array(file.data),
              })),
            }
          : undefined,
      },
      include: {
        branch: { select: { id: true, name: true } },
        files: { select: fileSelect, orderBy: { id: "asc" } },
      },
    });

    return jsonOk({ record: serializeRecord(record) }, 201);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError(e instanceof Error ? e.message : "정보 저장 실패", 400);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireApiVault();
    const form = await req.formData();
    const id = Number(form.get("id"));
    if (!id) return jsonError("ID가 필요합니다.");

    const existing = await prisma.infoRecord.findUnique({ where: { id } });
    if (!existing) return jsonError("없음", 404);
    assertRecordAccess(session.user.role, session.user.branchIds, existing);

    const title = form.get("title") != null ? String(form.get("title")).trim() : existing.title;
    const content = form.get("content") != null ? String(form.get("content")).trim() : existing.content;
    if (!title) return jsonError("항목 이름이 필요합니다.");

    let nextBranchId = existing.branchId;
    if (form.get("branchId") != null && String(form.get("branchId")) !== "") {
      nextBranchId = Number(form.get("branchId"));
      if (canViewAllVault(session.user.role)) {
        const branch = await prisma.branch.findUnique({ where: { id: nextBranchId } });
        if (!branch) return jsonError("지점이 없습니다.", 404);
      } else {
        ensureBranch(session.user.branchIds, nextBranchId);
      }
    }

    let files;
    try {
      files = await readUploadFiles(form, "files");
    } catch (err) {
      return jsonError(err instanceof Error ? err.message : "파일 업로드 실패");
    }

    const removeFileIds = String(form.get("removeFileIds") || "")
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (removeFileIds.length) {
      await prisma.infoFile.deleteMany({ where: { recordId: id, id: { in: removeFileIds } } });
    }

    if (files.length) {
      await prisma.infoFile.createMany({
        data: files.map((file) => ({
          recordId: id,
          fileName: file.fileName,
          mimeType: file.mimeType,
          size: file.size,
          kind: file.kind,
          data: new Uint8Array(file.data),
        })),
      });
    }

    const record = await prisma.infoRecord.update({
      where: { id },
      data: {
        title,
        content: content || null,
        branchId: nextBranchId,
      },
      include: {
        branch: { select: { id: true, name: true } },
        files: { select: fileSelect, orderBy: { id: "asc" } },
      },
    });

    return jsonOk({ record: serializeRecord(record) });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError(e instanceof Error ? e.message : "정보 수정 실패", 400);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireApiVault();
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!id) return jsonError("ID가 필요합니다.");
    const existing = await prisma.infoRecord.findUnique({ where: { id } });
    if (!existing) return jsonError("없음", 404);
    assertRecordAccess(session.user.role, session.user.branchIds, existing);
    await prisma.infoRecord.delete({ where: { id } });
    return jsonOk({ deleted: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError(e instanceof Error ? e.message : "정보 삭제 실패", 400);
  }
}
