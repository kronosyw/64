import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireApiVault } from "@/lib/api";
import { canViewAllVault } from "@/lib/vault";

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiVault();
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!id) return jsonError("파일 ID가 필요합니다.");

    const file = await prisma.infoFile.findUnique({
      where: { id },
      include: { record: { select: { branchId: true } } },
    });
    if (!file) return jsonError("없음", 404);

    if (!canViewAllVault(session.user.role) && !session.user.branchIds.includes(file.record.branchId)) {
      return jsonError("권한이 없습니다.", 403);
    }

    const bytes = new Uint8Array(file.data);
    const disposition = req.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
    const encoded = encodeURIComponent(file.fileName);

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Length": String(bytes.length),
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encoded}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("파일 조회 실패", 500);
  }
}
