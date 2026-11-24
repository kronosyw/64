import { EmploymentStatus, Prisma, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const MAX_OWNERS = 2;

export async function countActiveOwners(excludeId?: number) {
  return prisma.employee.count({
    where: {
      role: Role.OWNER,
      status: EmploymentStatus.ACTIVE,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

type CreateEmployeeInput = {
  name: string;
  role: Role;
  loginId: string;
  password: string;
  phone?: string | null;
  branchId?: number | null;
  ownerBranchIds?: number[];
  monthlySalary?: number | null;
  insuranceType?: "FOUR_INSURANCE" | "THREE_POINT_THREE";
  notes?: string | null;
  actorRole: Role;
  actorBranchIds: number[];
};

export async function createEmployeeAccount(input: CreateEmployeeInput) {
  const {
    name,
    role,
    loginId,
    password,
    phone,
    branchId,
    ownerBranchIds = [],
    monthlySalary,
    insuranceType,
    notes,
    actorRole,
    actorBranchIds,
  } = input;

  if (!name.trim() || !loginId.trim() || !password) {
    throw new Error("이름, 아이디, 비밀번호는 필수입니다.");
  }

  if (actorRole === Role.MANAGER) {
    if (role === Role.OWNER || role === Role.MANAGER) {
      throw new Error("지점장은 직원·파트타임만 등록할 수 있습니다.");
    }
    if (!branchId || !actorBranchIds.includes(branchId)) {
      throw new Error("자기 지점 직원만 등록할 수 있습니다.");
    }
  }

  if (actorRole === Role.OWNER && role !== Role.OWNER) {
    if (!branchId || !actorBranchIds.includes(branchId)) {
      throw new Error("배정된 지점만 선택할 수 있습니다.");
    }
  }

  if (role === Role.OWNER) {
    if (actorRole !== Role.OWNER) throw new Error("사장은 사장만 등록할 수 있습니다.");
    const owners = await countActiveOwners();
    if (owners >= MAX_OWNERS) throw new Error("사장은 최대 2명까지 가능합니다.");
    if (!ownerBranchIds.length) throw new Error("사장 지점을 1개 이상 배정하세요.");
    for (const id of ownerBranchIds) {
      if (!actorBranchIds.includes(id)) throw new Error("배정할 수 없는 지점이 있습니다.");
    }
  } else if (!branchId) {
    throw new Error("소속 지점이 필요합니다.");
  }

  const exists = await prisma.employee.findUnique({ where: { loginId } });
  if (exists) throw new Error("이미 사용 중인 아이디입니다.");

  const passwordHash = await hashPassword(password);

  return prisma.$transaction(async (tx) => {
    const employee = await tx.employee.create({
      data: {
        name: name.trim(),
        role,
        loginId: loginId.trim(),
        passwordHash,
        phone: phone || null,
        branchId: role === Role.OWNER ? null : branchId!,
        monthlySalary: monthlySalary ?? null,
        insuranceType:
          insuranceType ??
          (role === Role.PARTTIME ? "THREE_POINT_THREE" : "FOUR_INSURANCE"),
        notes: notes || null,
      },
    });

    if (role === Role.OWNER) {
      await tx.employeeBranch.createMany({
        data: ownerBranchIds.map((id) => ({ employeeId: employee.id, branchId: id })),
      });
    }

    return employee;
  });
}

export async function updateOwnerBranches(employeeId: number, branchIds: number[], actorBranchIds: number[]) {
  for (const id of branchIds) {
    if (!actorBranchIds.includes(id)) throw new Error("배정할 수 없는 지점이 있습니다.");
  }
  await prisma.$transaction([
    prisma.employeeBranch.deleteMany({ where: { employeeId } }),
    prisma.employeeBranch.createMany({
      data: branchIds.map((branchId) => ({ employeeId, branchId })),
    }),
  ]);
}

export function employeeListWhere(actorRole: Role, actorBranchIds: number[]): Prisma.EmployeeWhereInput {
  if (actorRole === Role.OWNER) {
    return {
      OR: [
        { role: Role.OWNER },
        { branchId: { in: actorBranchIds } },
      ],
    };
  }
  return {
    branchId: { in: actorBranchIds },
    role: { in: [Role.STAFF, Role.PARTTIME, Role.MANAGER] },
  };
}
