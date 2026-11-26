import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";

/** Unauthenticated branch list for staff login. */
export async function GET() {
  try {
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
    return jsonOk({ branches });
  } catch {
    return jsonError("지점 목록을 불러오지 못했습니다.", 500);
  }
}
