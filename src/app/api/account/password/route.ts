import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiSession } from "@/lib/api";
import { hashPassword } from "@/lib/employees";

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiSession();
    const body = await req.json();
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    if (newPassword.length < 6) return jsonError("새 비밀번호는 6자 이상이어야 합니다.");

    const employee = await prisma.employee.findUnique({ where: { id: Number(session.user.id) } });
    if (!employee) return jsonError("계정 없음", 404);
    const ok = await bcrypt.compare(currentPassword, employee.passwordHash);
    if (!ok) return jsonError("현재 비밀번호가 올바르지 않습니다.");

    await prisma.employee.update({
      where: { id: employee.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    return jsonOk({ message: "비밀번호가 변경되었습니다." });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("비밀번호 변경 실패", 400);
  }
}
