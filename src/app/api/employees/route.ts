import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiOps } from "@/lib/api";
import { createEmployeeAccount, employeeListWhere } from "@/lib/employees";
import { roleLabel } from "@/lib/roles";

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiOps();
    const branchId = req.nextUrl.searchParams.get("branchId");
    const where = employeeListWhere(session.user.role, session.user.branchIds);
    if (branchId) {
      const id = Number(branchId);
      if (!session.user.branchIds.includes(id)) return jsonError("지점 권한 없음", 403);
      Object.assign(where, {
        OR: undefined,
        AND: [
          employeeListWhere(session.user.role, session.user.branchIds),
          {
            OR: [{ branchId: id }, { role: Role.OWNER, ownerBranches: { some: { branchId: id } } }],
          },
        ],
      });
    }

    const employees = await prisma.employee.findMany({
      where: employeeListWhere(session.user.role, session.user.branchIds),
      include: {
        branch: { select: { id: true, name: true } },
        ownerBranches: { include: { branch: { select: { id: true, name: true } } } },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    return jsonOk({
      actorRole: session.user.role,
      employees: employees.map((e) => ({
        ...e,
        passwordHash: undefined,
        roleLabel: roleLabel(e.role),
      })),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("직원 조회 실패", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiOps();
    const body = await req.json();
    const role = body.role as Role;
    if (!Object.values(Role).includes(role)) return jsonError("잘못된 등급입니다.");

    const employee = await createEmployeeAccount({
      name: String(body.name ?? ""),
      role,
      loginId: String(body.loginId ?? ""),
      password: String(body.password ?? ""),
      phone: body.phone,
      branchId: body.branchId ? Number(body.branchId) : null,
      ownerBranchIds: Array.isArray(body.ownerBranchIds)
        ? body.ownerBranchIds.map((n: unknown) => Number(n))
        : [],
      monthlySalary: body.monthlySalary ? Number(body.monthlySalary) : null,
      insuranceType: body.insuranceType,
      notes: body.notes,
      actorRole: session.user.role,
      actorBranchIds: session.user.branchIds,
    });

    return jsonOk({ employee: { ...employee, passwordHash: undefined } }, 201);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError(e instanceof Error ? e.message : "직원 등록 실패", 400);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireApiOps();
    const body = await req.json();
    const id = Number(body.id);
    if (!id) return jsonError("직원 ID가 필요합니다.");

    const target = await prisma.employee.findUnique({
      where: { id },
      include: { ownerBranches: true },
    });
    if (!target) return jsonError("직원을 찾을 수 없습니다.", 404);

    if (target.role === Role.SUPERADMIN && session.user.role !== Role.SUPERADMIN) {
      return jsonError("권한이 없습니다.", 403);
    }

    if (session.user.role === Role.MANAGER) {
      if (!target.branchId || !session.user.branchIds.includes(target.branchId)) {
        return jsonError("권한이 없습니다.", 403);
      }
      if (target.role === Role.OWNER || target.role === Role.MANAGER || target.role === Role.SUPERADMIN) {
        return jsonError("권한이 없습니다.", 403);
      }
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.phone !== undefined) data.phone = body.phone || null;
    if (body.status !== undefined) data.status = body.status;
    if (body.monthlySalary !== undefined) data.monthlySalary = body.monthlySalary ? Number(body.monthlySalary) : null;
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.branchId !== undefined && target.role !== Role.OWNER && target.role !== Role.SUPERADMIN) {
      const branchId = Number(body.branchId);
      if (session.user.role !== Role.SUPERADMIN && !session.user.branchIds.includes(branchId)) {
        return jsonError("지점 권한 없음", 403);
      }
      data.branchId = branchId;
    }

    const employee = await prisma.employee.update({ where: { id }, data });

    if (
      target.role === Role.OWNER &&
      Array.isArray(body.ownerBranchIds) &&
      (session.user.role === Role.OWNER || session.user.role === Role.SUPERADMIN)
    ) {
      const ids = body.ownerBranchIds.map((n: unknown) => Number(n));
      for (const bid of ids) {
        if (session.user.role !== Role.SUPERADMIN && !session.user.branchIds.includes(bid)) {
          return jsonError("배정 불가 지점", 403);
        }
      }
      await prisma.employeeBranch.deleteMany({ where: { employeeId: id } });
      await prisma.employeeBranch.createMany({
        data: ids.map((branchId: number) => ({ employeeId: id, branchId })),
      });
    }

    return jsonOk({ employee: { ...employee, passwordHash: undefined } });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError(e instanceof Error ? e.message : "직원 수정 실패", 400);
  }
}
