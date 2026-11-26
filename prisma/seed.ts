import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { shiftRowsForBranch } from "../src/lib/shift-options";

const prisma = new PrismaClient();

const BRANCHES = [
  {
    code: "SP01",
    name: process.env.SEED_BRANCH_SONGPA_NAME || "육식사관학교 송파점",
  },
  {
    code: "YT01",
    name: process.env.SEED_BRANCH_YATAP_NAME || "육식사관학교 분당야탑점",
  },
];

async function main() {
  const loginId = process.env.SEED_OWNER_LOGIN_ID || "owner";
  const password = process.env.SEED_OWNER_PASSWORD || "change-me-now";
  const name = process.env.SEED_OWNER_NAME || "사장";
  const superLoginId = process.env.SEED_SUPER_LOGIN_ID || "admin";
  const superPassword = process.env.SEED_SUPER_PASSWORD || password;
  const superName = process.env.SEED_SUPER_NAME || "최고관리자";

  // Legacy single-branch env still creates HQ if requested; default is Songpa+Yatap.
  if (process.env.SEED_BRANCH_CODE && process.env.SEED_BRANCH_CODE !== "SP01") {
    BRANCHES.unshift({
      code: process.env.SEED_BRANCH_CODE,
      name: process.env.SEED_BRANCH_NAME || process.env.SEED_BRANCH_CODE,
    });
  }

  const branches = [];
  for (const row of BRANCHES) {
    const branch = await prisma.branch.upsert({
      where: { code: row.code },
      update: { name: row.name, isActive: true },
      create: { name: row.name, code: row.code, isActive: true },
    });
    branches.push(branch);
    const shiftCount = await prisma.branchShift.count({ where: { branchId: branch.id } });
    if (shiftCount === 0) {
      await prisma.branchShift.createMany({ data: shiftRowsForBranch(branch.id) });
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.employee.findUnique({ where: { loginId } });
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

  for (const branch of branches) {
    await prisma.employeeBranch.upsert({
      where: { employeeId_branchId: { employeeId: owner.id, branchId: branch.id } },
      update: {},
      create: { employeeId: owner.id, branchId: branch.id },
    });
  }

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

  await prisma.adPlatform.upsert({
    where: { code: "baemin" },
    update: { name: "배달의민족", colorCode: "#2AC1BC", sortOrder: 1, isActive: true },
    create: { name: "배달의민족", code: "baemin", colorCode: "#2AC1BC", sortOrder: 1 },
  });
  await prisma.adPlatform.upsert({
    where: { code: "coupang" },
    update: { name: "쿠팡이츠", colorCode: "#E31837", sortOrder: 2, isActive: true },
    create: { name: "쿠팡이츠", code: "coupang", colorCode: "#E31837", sortOrder: 2 },
  });

  console.log(
    `Seeded super=${superLoginId} owner=${loginId} branches=${branches.map((b) => `${b.code}:${b.name}`).join(",")}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
