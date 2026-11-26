/**
 * Merge legacy branch codes into canonical SP01 / YT01.
 *   64SP → SP01 (육식사관학교 송파점)
 *   64BY → YT01 (육식사관학교 분당야탑점)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PAIRS: Array<{ keepCode: string; absorbCode: string; name: string }> = [
  { keepCode: "SP01", absorbCode: "64SP", name: "육식사관학교 송파점" },
  { keepCode: "YT01", absorbCode: "64BY", name: "육식사관학교 분당야탑점" },
];

async function mergePair(keepCode: string, absorbCode: string, name: string) {
  const keep = await prisma.branch.findUnique({ where: { code: keepCode } });
  const absorb = await prisma.branch.findUnique({ where: { code: absorbCode } });
  if (!absorb) {
    console.log(`skip ${absorbCode}: not found`);
    if (keep) {
      await prisma.branch.update({
        where: { id: keep.id },
        data: { name, isActive: true },
      });
    }
    return;
  }
  if (!keep) {
    console.log(`rename ${absorbCode} → ${keepCode}`);
    await prisma.branch.update({
      where: { id: absorb.id },
      data: { code: keepCode, name, isActive: true },
    });
    return;
  }

  const keepId = keep.id;
  const absorbId = absorb.id;
  console.log(`merge ${absorbCode}(#${absorbId}) → ${keepCode}(#${keepId})`);

  await prisma.branch.update({
    where: { id: keepId },
    data: { name, isActive: true },
  });

  // Shifts: map absorb shift → keep shift by name
  const keepShifts = await prisma.branchShift.findMany({ where: { branchId: keepId } });
  const absorbShifts = await prisma.branchShift.findMany({ where: { branchId: absorbId } });
  const shiftMap = new Map<number, number | null>();
  for (const s of absorbShifts) {
    const match = keepShifts.find((k) => k.name === s.name);
    shiftMap.set(s.id, match?.id ?? null);
  }

  for (const [fromId, toId] of shiftMap) {
    await prisma.schedule.updateMany({
      where: { shiftId: fromId },
      data: { shiftId: toId },
    });
  }

  await prisma.schedule.updateMany({
    where: { branchId: absorbId },
    data: { branchId: keepId },
  });

  await prisma.employee.updateMany({
    where: { branchId: absorbId },
    data: { branchId: keepId },
  });

  // EmployeeBranch: move or drop duplicates
  const absorbEb = await prisma.employeeBranch.findMany({ where: { branchId: absorbId } });
  for (const row of absorbEb) {
    const exists = await prisma.employeeBranch.findUnique({
      where: {
        employeeId_branchId: { employeeId: row.employeeId, branchId: keepId },
      },
    });
    if (exists) {
      await prisma.employeeBranch.delete({ where: { id: row.id } });
    } else {
      await prisma.employeeBranch.update({
        where: { id: row.id },
        data: { branchId: keepId },
      });
    }
  }

  await prisma.memo.updateMany({
    where: { branchId: absorbId },
    data: { branchId: keepId },
  });

  // Attendance: unique(branch, employee, date)
  const absorbAtt = await prisma.attendance.findMany({ where: { branchId: absorbId } });
  for (const row of absorbAtt) {
    const clash = await prisma.attendance.findUnique({
      where: {
        branchId_employeeId_attendanceDate: {
          branchId: keepId,
          employeeId: row.employeeId,
          attendanceDate: row.attendanceDate,
        },
      },
    });
    if (clash) {
      await prisma.attendance.delete({ where: { id: row.id } });
    } else {
      await prisma.attendance.update({
        where: { id: row.id },
        data: { branchId: keepId },
      });
    }
  }

  // Payroll: unique(branch, year, month) — move items then drop absorb
  const absorbPayrolls = await prisma.payroll.findMany({
    where: { branchId: absorbId },
    include: { items: true },
  });
  for (const p of absorbPayrolls) {
    const keepP = await prisma.payroll.findUnique({
      where: {
        branchId_year_month: { branchId: keepId, year: p.year, month: p.month },
      },
    });
    if (!keepP) {
      await prisma.payroll.update({
        where: { id: p.id },
        data: { branchId: keepId },
      });
      continue;
    }
    for (const item of p.items) {
      await prisma.payrollItem.update({
        where: { id: item.id },
        data: { payrollId: keepP.id },
      });
    }
    await prisma.payroll.delete({ where: { id: p.id } });
  }

  // Board posts
  const absorbBp = await prisma.boardPostBranch.findMany({ where: { branchId: absorbId } });
  for (const row of absorbBp) {
    const exists = await prisma.boardPostBranch.findUnique({
      where: { postId_branchId: { postId: row.postId, branchId: keepId } },
    });
    if (exists) {
      await prisma.boardPostBranch.delete({
        where: { postId_branchId: { postId: row.postId, branchId: absorbId } },
      });
    } else {
      await prisma.$executeRaw`
        UPDATE board_post_branches SET branch_id = ${keepId}
        WHERE post_id = ${row.postId} AND branch_id = ${absorbId}
      `;
    }
  }

  await prisma.infoRecord.updateMany({
    where: { branchId: absorbId },
    data: { branchId: keepId },
  });

  // Ad stores: merge same platform+name into keep branch store
  const absorbStores = await prisma.adStore.findMany({ where: { branchId: absorbId } });
  for (const s of absorbStores) {
    const twin = await prisma.adStore.findFirst({
      where: {
        branchId: keepId,
        platformId: s.platformId,
        name: s.name,
      },
    });
    if (!twin) {
      await prisma.adStore.update({
        where: { id: s.id },
        data: { branchId: keepId },
      });
      continue;
    }
    // Move reviews (unique store+date)
    const reviews = await prisma.adReview.findMany({ where: { storeId: s.id } });
    for (const r of reviews) {
      const clash = await prisma.adReview.findUnique({
        where: {
          storeId_reviewDate: { storeId: twin.id, reviewDate: r.reviewDate },
        },
      });
      if (clash) {
        await prisma.adReview.delete({ where: { id: r.id } });
      } else {
        await prisma.adReview.update({
          where: { id: r.id },
          data: { storeId: twin.id },
        });
      }
    }
    const costs = await prisma.adCost.findMany({ where: { storeId: s.id } });
    for (const c of costs) {
      const clash = await prisma.adCost.findUnique({
        where: {
          storeId_costDate: { storeId: twin.id, costDate: c.costDate },
        },
      });
      if (clash) {
        await prisma.adCost.delete({ where: { id: c.id } });
      } else {
        await prisma.adCost.update({
          where: { id: c.id },
          data: { storeId: twin.id, branchId: keepId },
        });
      }
    }
    await prisma.adStore.delete({ where: { id: s.id } });
  }

  await prisma.adCost.updateMany({
    where: { branchId: absorbId },
    data: { branchId: keepId },
  });
  await prisma.adExposure.updateMany({
    where: { branchId: absorbId },
    data: { branchId: keepId },
  });

  await prisma.branchShift.deleteMany({ where: { branchId: absorbId } });
  await prisma.branch.delete({ where: { id: absorbId } });
  console.log(`deleted ${absorbCode}`);
}

async function main() {
  for (const p of PAIRS) {
    await mergePair(p.keepCode, p.absorbCode, p.name);
  }
  const left = await prisma.branch.findMany({
    select: { id: true, code: true, name: true, isActive: true },
    orderBy: { id: "asc" },
  });
  console.log("branches after merge:", JSON.stringify(left, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
