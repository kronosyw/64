import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { shiftRowsForBranch } from "../src/lib/shift-options";

const prisma = new PrismaClient();

async function main() {
  const loginId = process.env.SEED_OWNER_LOGIN_ID || "owner";
  const password = process.env.SEED_OWNER_PASSWORD || "change-me-now";
  const name = process.env.SEED_OWNER_NAME || "사장";
  const superLoginId = process.env.SEED_SUPER_LOGIN_ID || "admin";
  const superPassword = process.env.SEED_SUPER_PASSWORD || password;
  const superName = process.env.SEED_SUPER_NAME || "최고관리자";
  const branchName = process.env.SEED_BRANCH_NAME || "본점";
  const branchCode = process.env.SEED_BRANCH_CODE || "HQ01";

  const branch = await prisma.branch.upsert({
    where: { code: branchCode },
    update: { name: branchName, isActive: true },
    create: { name: branchName, code: branchCode, isActive: true },
  });

  const existing = await prisma.employee.findUnique({ where: { loginId } });
  const passwordHash = await bcrypt.hash(password, 10);

  const owner = existing
    ? await prisma.employee.update({
        where: { id: existing.id },
        data: { name, role: Role.OWNER, passwordHash, branchId: null, status: "ACTIVE" },
      })
    : await prisma.employee.create({
        data: {
          name,
          role: Role.OWNER,
          loginId,
          passwordHash,
          branchId: null,
          status: "ACTIVE",
        },
      });

  await prisma.employeeBranch.upsert({
    where: { employeeId_branchId: { employeeId: owner.id, branchId: branch.id } },
    update: {},
    create: { employeeId: owner.id, branchId: branch.id },
  });

  const superHash = await bcrypt.hash(superPassword, 10);
  const existingSuper = await prisma.employee.findUnique({ where: { loginId: superLoginId } });
  if (existingSuper) {
    await prisma.employee.update({
      where: { id: existingSuper.id },
      data: {
        name: superName,
        role: Role.SUPERADMIN,
        passwordHash: superHash,
        branchId: null,
        status: "ACTIVE",
      },
    });
  } else {
    await prisma.employee.create({
      data: {
        name: superName,
        role: Role.SUPERADMIN,
        loginId: superLoginId,
        passwordHash: superHash,
        branchId: null,
        status: "ACTIVE",
      },
    });
  }

  const shiftCount = await prisma.branchShift.count({ where: { branchId: branch.id } });
  if (shiftCount === 0) {
    await prisma.branchShift.createMany({ data: shiftRowsForBranch(branch.id) });
  }

  await prisma.adPlatform.upsert({
    where: { code: "baemin" },
    update: {},
    create: { name: "배달의민족", code: "baemin", colorCode: "#2AC1BC", sortOrder: 1 },
  });
  await prisma.adPlatform.upsert({
    where: { code: "coupang" },
    update: {},
    create: { name: "쿠팡이츠", code: "coupang", colorCode: "#E31837", sortOrder: 2 },
  });

  console.log(`Seeded super=${superLoginId} owner=${loginId} branch=${branch.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
