import { NextRequest } from "next/server";
import { EmploymentStatus, InsuranceType, PayBasis, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiOps } from "@/lib/api";
import { createEmployeeAccount, employeeListWhere, needsStaffLogin, staffLoginId } from "@/lib/employees";
import { parseOptionalDate } from "@/lib/hr";
import { canManageEmployeeAccount, roleLabel } from "@/lib/roles";

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiOps();
    const actorId = Number(session.user.id);
    const branchId = req.nextUrl.searchParams.get("branchId");
    let where = employeeListWhere(session.user.role, session.user.branchIds, actorId);
    if (branchId) {
      const id = Number(branchId);
      if (!session.user.branchIds.includes(id)) return jsonError("지점 권한 없음", 403);
      where = {
        AND: [
          employeeListWhere(session.user.role, session.user.branchIds, actorId),
          {
            OR: [
              { id: actorId },
              { branchId: id },
              { role: Role.OWNER, ownerBranches: { some: { branchId: id } } },
            ],
          },
        ],
      };
    }

    const employees = await prisma.employee.findMany({
      where,
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

    const insuranceType =
      body.insuranceType === InsuranceType.THREE_POINT_THREE || body.insuranceType === "THREE_POINT_THREE"
        ? InsuranceType.THREE_POINT_THREE
        : body.insuranceType === InsuranceType.FOUR_INSURANCE || body.insuranceType === "FOUR_INSURANCE"
          ? InsuranceType.FOUR_INSURANCE
          : undefined;

    const payBasis =
      body.payBasis === PayBasis.HOURLY || body.payBasis === "HOURLY"
        ? PayBasis.HOURLY
        : body.payBasis === PayBasis.MONTHLY || body.payBasis === "MONTHLY"
          ? PayBasis.MONTHLY
          : undefined;
    const workDaysPerWeek = Number(body.workDaysPerWeek) === 6 ? 6 : 5;

    const employee = await createEmployeeAccount({
      name: String(body.name ?? ""),
      role,
      loginId: String(body.loginId ?? ""),
      password: String(body.password ?? ""),
      phone: body.phone,
      ssn: body.ssn,
      hireDate: parseOptionalDate(body.hireDate),
      healthCertExpire: parseOptionalDate(body.healthCertExpire),
      bankName: body.bankName,
      accountNumber: body.accountNumber,
      accountHolder: body.accountHolder,
      branchId: body.branchId ? Number(body.branchId) : null,
      ownerBranchIds: Array.isArray(body.ownerBranchIds)
        ? body.ownerBranchIds.map((n: unknown) => Number(n))
        : [],
      monthlySalary: body.monthlySalary !== undefined && body.monthlySalary !== "" ? Number(body.monthlySalary) : null,
      insuranceType,
      payBasis,
      workDaysPerWeek,
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

    const isSelf = Number(session.user.id) === target.id;
    if (!isSelf && !canManageEmployeeAccount(session.user.role, target.role)) {
      return jsonError("권한이 없습니다.", 403);
    }

    if (!isSelf && session.user.role === Role.MANAGER) {
      if (!target.branchId || !session.user.branchIds.includes(target.branchId)) {
        return jsonError("권한이 없습니다.", 403);
      }
    }

    if (!isSelf && session.user.role === Role.OWNER) {
      if (!target.branchId || !session.user.branchIds.includes(target.branchId)) {
        return jsonError("권한이 없습니다.", 403);
      }
    }

    if (isSelf && body.status !== undefined && body.status !== target.status) {
      return jsonError("본인 계정 상태는 변경할 수 없습니다.", 403);
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.phone !== undefined) data.phone = body.phone || null;
    if (body.ssn !== undefined) data.ssn = body.ssn ? String(body.ssn).trim() : null;
    if (body.hireDate !== undefined) data.hireDate = parseOptionalDate(body.hireDate);
    if (body.healthCertExpire !== undefined) data.healthCertExpire = parseOptionalDate(body.healthCertExpire);
    if (body.bankName !== undefined) data.bankName = body.bankName ? String(body.bankName).trim() : null;
    if (body.accountNumber !== undefined) {
      data.accountNumber = body.accountNumber ? String(body.accountNumber).trim() : null;
    }
    if (body.accountHolder !== undefined) {
      data.accountHolder = body.accountHolder ? String(body.accountHolder).trim() : null;
    }
    if (body.status !== undefined) {
      if (!Object.values(EmploymentStatus).includes(body.status)) return jsonError("잘못된 상태입니다.");
      data.status = body.status;
    }
    if (body.monthlySalary !== undefined) {
      data.monthlySalary = body.monthlySalary === "" || body.monthlySalary === null ? null : Number(body.monthlySalary);
    }
    if (body.insuranceType !== undefined) {
      if (!Object.values(InsuranceType).includes(body.insuranceType)) {
        return jsonError("근무형태(보험)가 올바르지 않습니다.");
      }
      data.insuranceType = body.insuranceType;
    }
    if (body.payBasis !== undefined) {
      if (body.payBasis !== PayBasis.MONTHLY && body.payBasis !== PayBasis.HOURLY && body.payBasis !== "MONTHLY" && body.payBasis !== "HOURLY") {
        return jsonError("급여 입력 방식이 올바르지 않습니다.");
      }
      data.payBasis = body.payBasis === "HOURLY" || body.payBasis === PayBasis.HOURLY ? PayBasis.HOURLY : PayBasis.MONTHLY;
    }
    if (body.workDaysPerWeek !== undefined) {
      data.workDaysPerWeek = Number(body.workDaysPerWeek) === 6 ? 6 : 5;
    }
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.branchId !== undefined && target.role !== Role.OWNER && target.role !== Role.SUPERADMIN) {
      const branchId = Number(body.branchId);
      if (session.user.role !== Role.SUPERADMIN && !session.user.branchIds.includes(branchId)) {
        return jsonError("지점 권한 없음", 403);
      }
      data.branchId = branchId;
    }

    const nextName = data.name !== undefined ? String(data.name) : target.name;
    const nextBranchId =
      data.branchId !== undefined ? (data.branchId as number | null) : target.branchId;
    if (nextBranchId != null) {
      const nameDup = await prisma.employee.findFirst({
        where: { branchId: nextBranchId, name: nextName, NOT: { id } },
      });
      if (nameDup) return jsonError("같은 지점에 동일한 이름이 이미 있습니다.");
    }

    if (needsStaffLogin(target.role) && nextBranchId != null) {
      data.loginId = staffLoginId(nextBranchId, nextName);
    }

    if (body.password) {
      const { hashPassword } = await import("@/lib/employees");
      data.passwordHash = await hashPassword(String(body.password));
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

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireApiOps();
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!id) return jsonError("직원 ID가 필요합니다.");
    if (String(id) === session.user.id) return jsonError("본인 계정은 삭제할 수 없습니다.");

    const target = await prisma.employee.findUnique({ where: { id } });
    if (!target) return jsonError("직원을 찾을 수 없습니다.", 404);

    if (!canManageEmployeeAccount(session.user.role, target.role)) {
      return jsonError("권한이 없습니다.", 403);
    }
    if (!isOwnerOrBelowRole(target.role)) {
      return jsonError("사장 이하 계정만 삭제할 수 있습니다.", 403);
    }

    if (session.user.role === Role.MANAGER || session.user.role === Role.OWNER) {
      if (!target.branchId || !session.user.branchIds.includes(target.branchId)) {
        return jsonError("권한이 없습니다.", 403);
      }
    }

    await prisma.employee.delete({ where: { id } });
    return jsonOk({ deleted: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError(e instanceof Error ? e.message : "직원 삭제 실패", 400);
  }
}

function isOwnerOrBelowRole(role: Role) {
  return role === Role.OWNER || role === Role.MANAGER || role === Role.STAFF || role === Role.PARTTIME;
}
