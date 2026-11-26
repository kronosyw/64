/**
 * SKADI 64 employees + schedules → yuksa-64
 *
 * Rules:
 * - Only ACTIVE staff from dump (export already filters status=근무)
 * - Skip names: 정래형, 홍승수 (already OWNER in target)
 * - Map branches → 육식사관학교 송파점 (SP01) / 육식사관학교 분당야탑점 (YT01)
 * - Password for all migrated employees: 1234
 * - 직원 → STAFF, 파트타임 → PARTTIME
 *
 * Usage:
 *   npx tsx scripts/migrate-skadi-employees-schedules.ts --dry-run --file scripts/data/skadi-employees-schedules.json
 *   npx tsx scripts/migrate-skadi-employees-schedules.ts --file scripts/data/skadi-employees-schedules.json
 */
import { PrismaClient, Role, WorkType, type EmploymentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { staffLoginId } from "../src/lib/employees";
import { shiftRowsForBranch } from "../src/lib/shift-options";

const prisma = new PrismaClient();

const SKIP_NAMES = new Set(["정래형", "홍승수"]);
const DEFAULT_PASSWORD = "1234";

type DumpBranch = {
  branch_id: number;
  branch_name: string;
  branch_code?: string | null;
};

type DumpEmployee = {
  id: number;
  name: string;
  employee_type: string;
  phone?: string | null;
  ssn?: string | null;
  hire_date?: string | null;
  health_cert_expire_date?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  account_holder?: string | null;
  status?: string;
  notes?: string | null;
  branch_id?: number | null;
  branch_name?: string | null;
  monthly_salary?: number | string | null;
  insurance_type?: string | null;
};

type DumpSchedule = {
  id: number;
  branch_id?: number | null;
  employee_id: number;
  employee_name?: string | null;
  work_type: string;
  work_date: string;
  start_time?: string | null;
  end_time?: string | null;
  work_hours?: number | string | null;
  memo?: string | null;
};

type Dump = {
  branches: DumpBranch[];
  employees: DumpEmployee[];
  schedules: DumpSchedule[];
};

const WORK_TYPE_MAP: Record<string, WorkType> = {
  오픈: WorkType.OPEN,
  마감: WorkType.CLOSE,
  오픈마감: WorkType.OPEN_CLOSE,
  저녁PT: WorkType.EVENING_PT,
  풀타임PT: WorkType.FULL_PT,
  휴무: WorkType.OFF,
};

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const fileIdx = args.indexOf("--file");
  const file =
    fileIdx >= 0
      ? args[fileIdx + 1]
      : path.join(process.cwd(), "scripts/data/skadi-employees-schedules.json");
  return { dryRun, file };
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, "");
}

/** SKADI branch row / name → target code SP01 | YT01 */
function targetBranchCode(input: { branch_name?: string | null; branch_code?: string | null }): "SP01" | "YT01" | null {
  const name = `${input.branch_name || ""} ${input.branch_code || ""}`;
  if (/송파/.test(name)) return "SP01";
  if (/야탑|분당|yatap|bundang/i.test(name)) return "YT01";
  return null;
}

function mapRole(employeeType: string): Role {
  return String(employeeType).includes("파트") ? Role.PARTTIME : Role.STAFF;
}

function mapInsurance(raw?: string | null): "FOUR_INSURANCE" | "THREE_POINT_THREE" {
  if (raw && String(raw).includes("3.3")) return "THREE_POINT_THREE";
  return "FOUR_INSURANCE";
}

function asDate(value?: string | null): Date | null {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return new Date(s);
}

function asTime(value?: string | null): string | null {
  if (!value) return null;
  const s = String(value);
  // MySQL TIME or "HH:MM:SS" / "HH:MM"
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

async function resolveTargetBranches() {
  const byCode = async (code: string, nameHint: string) => {
    let b = await prisma.branch.findUnique({ where: { code } });
    if (!b) {
      b = await prisma.branch.findFirst({ where: { name: { contains: nameHint } } });
    }
    if (!b) {
      throw new Error(`Target branch not found for ${code} / ${nameHint}. Seed or create first.`);
    }
    const shiftCount = await prisma.branchShift.count({ where: { branchId: b.id } });
    if (shiftCount === 0) {
      await prisma.branchShift.createMany({ data: shiftRowsForBranch(b.id) });
    }
    return b;
  };
  const SP01 = await byCode("SP01", "송파");
  const YT01 = await byCode("YT01", "야탑");
  return { SP01, YT01 };
}

async function main() {
  const { dryRun, file } = parseArgs();
  if (!fs.existsSync(file)) {
    console.error(`Dump not found: ${file}`);
    console.error("Export: php 64/export_employees_schedules_json.php > scripts/data/skadi-employees-schedules.json");
    process.exit(1);
  }
  const dump = JSON.parse(fs.readFileSync(file, "utf8")) as Dump;
  console.log(`Mode=${dryRun ? "DRY-RUN" : "APPLY"} file=${file}`);
  console.log(
    `Dump branches=${dump.branches?.length || 0} employees=${dump.employees?.length || 0} schedules=${dump.schedules?.length || 0}`,
  );

  const skadiBranchCode = new Map<number, "SP01" | "YT01">();
  for (const b of dump.branches || []) {
    const code = targetBranchCode(b);
    if (code) {
      skadiBranchCode.set(Number(b.branch_id), code);
      console.log(`  skadi branch ${b.branch_id} "${b.branch_name}" → ${code}`);
    } else {
      console.warn(`  skadi branch ${b.branch_id} "${b.branch_name}" → UNMAPPED (skipped)`);
    }
  }

  const targets = dryRun
    ? ({
        SP01: { id: -1, code: "SP01", name: "육식사관학교 송파점" },
        YT01: { id: -2, code: "YT01", name: "육식사관학교 분당야탑점" },
      } as Awaited<ReturnType<typeof resolveTargetBranches>>)
    : await resolveTargetBranches();

  console.log(`Target SP01=#${targets.SP01.id} ${targets.SP01.name}`);
  console.log(`Target YT01=#${targets.YT01.id} ${targets.YT01.name}`);

  const passwordHash = dryRun ? "" : await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // old employee id → new employee id
  const idMap = new Map<number, number>();
  let empCreated = 0;
  let empUpdated = 0;
  let empSkipped = 0;

  for (const e of dump.employees || []) {
    const name = (e.name || "").trim();
    if (!name) {
      empSkipped += 1;
      continue;
    }
    if (SKIP_NAMES.has(name) || SKIP_NAMES.has(normalizeName(name))) {
      console.log(`  skip owner-already-exists: ${name}`);
      empSkipped += 1;
      continue;
    }
    if (e.status && e.status !== "근무") {
      console.log(`  skip non-active: ${name} (${e.status})`);
      empSkipped += 1;
      continue;
    }

    let code =
      (e.branch_id != null ? skadiBranchCode.get(Number(e.branch_id)) : null) ||
      targetBranchCode({ branch_name: e.branch_name || "" });
    if (!code) {
      console.warn(`  skip no-branch: ${name} (branch_id=${e.branch_id}, name=${e.branch_name})`);
      empSkipped += 1;
      continue;
    }
    const branch = targets[code];
    const role = mapRole(e.employee_type);
    const loginId = staffLoginId(branch.id, name);

    console.log(
      `  employee ${name} type=${e.employee_type} → ${code}/#${branch.id} role=${role} loginId=${loginId}`,
    );

    if (dryRun) {
      idMap.set(Number(e.id), -Number(e.id));
      empCreated += 1;
      continue;
    }

    const existingByPair = await prisma.employee.findFirst({
      where: { branchId: branch.id, name },
    });
    const existingByLogin = await prisma.employee.findUnique({ where: { loginId } });
    const existing = existingByPair || existingByLogin;

    // Never overwrite OWNER / SUPERADMIN / MANAGER
    if (existing && (existing.role === Role.OWNER || existing.role === Role.SUPERADMIN || existing.role === Role.MANAGER)) {
      console.log(`  skip protected role: ${name} (${existing.role})`);
      empSkipped += 1;
      continue;
    }

    const data = {
      name,
      role,
      loginId,
      passwordHash,
      phone: e.phone || null,
      ssn: e.ssn || null,
      hireDate: asDate(e.hire_date),
      healthCertExpire: asDate(e.health_cert_expire_date),
      bankName: e.bank_name || null,
      accountNumber: e.account_number || null,
      accountHolder: e.account_holder || null,
      monthlySalary: e.monthly_salary != null ? Number(e.monthly_salary) || null : null,
      insuranceType: mapInsurance(e.insurance_type),
      payBasis: role === Role.PARTTIME ? ("HOURLY" as const) : ("MONTHLY" as const),
      status: "ACTIVE" as EmploymentStatus,
      notes: e.notes || null,
      branchId: branch.id,
    };

    const row = existing
      ? await prisma.employee.update({ where: { id: existing.id }, data })
      : await prisma.employee.create({ data });
    if (existing) empUpdated += 1;
    else empCreated += 1;
    idMap.set(Number(e.id), row.id);
  }

  // shifts cache per branch
  const shiftsByBranch = new Map<number, Map<string, { id: number; name: string; isOff: boolean }>>();
  async function shiftFor(branchId: number, workTypeKo: string) {
    if (!shiftsByBranch.has(branchId)) {
      const list = await prisma.branchShift.findMany({ where: { branchId } });
      shiftsByBranch.set(
        branchId,
        new Map(list.map((s) => [s.name, { id: s.id, name: s.name, isOff: s.isOff }])),
      );
    }
    return shiftsByBranch.get(branchId)!.get(workTypeKo) || null;
  }

  let schCreated = 0;
  let schUpdated = 0;
  let schSkipped = 0;

  const empBranchCode = new Map<number, "SP01" | "YT01">();
  const empNameById = new Map<number, string>();
  if (!dryRun) {
    const empIds = [...new Set(idMap.values())];
    if (empIds.length) {
      const rows = await prisma.employee.findMany({
        where: { id: { in: empIds } },
        select: { id: true, name: true, branchId: true },
      });
      for (const row of rows) {
        empNameById.set(row.id, row.name);
        if (row.branchId === targets.SP01.id) empBranchCode.set(row.id, "SP01");
        if (row.branchId === targets.YT01.id) empBranchCode.set(row.id, "YT01");
      }
    }
  }

  type SchedulePayload = {
    branchId: number;
    employeeId: number;
    employeeName: string;
    workType: WorkType;
    shiftId: number | null;
    shiftName: string;
    workDate: Date;
    startTime: string | null;
    endTime: string | null;
    workHours: number | null;
    createdBy: string;
    updatedBy: string;
  };

  const toCreate: SchedulePayload[] = [];
  const toUpdate: Array<{ id: number; data: SchedulePayload }> = [];
  const existingKey = new Map<string, number>();

  if (!dryRun) {
    const empIds = [...new Set(idMap.values())];
    if (empIds.length) {
      const existingRows = await prisma.schedule.findMany({
        where: { employeeId: { in: empIds } },
        select: { id: true, branchId: true, employeeId: true, workDate: true, workType: true },
      });
      for (const row of existingRows) {
        const key = `${row.branchId}|${row.employeeId}|${row.workDate.toISOString().slice(0, 10)}|${row.workType}`;
        existingKey.set(key, row.id);
      }
    }
  }

  for (const s of dump.schedules || []) {
    const newEmpId = idMap.get(Number(s.employee_id));
    if (!newEmpId) {
      schSkipped += 1;
      continue;
    }

    let code =
      (s.branch_id != null ? skadiBranchCode.get(Number(s.branch_id)) : null) || null;
    if (!code && !dryRun) {
      code = empBranchCode.get(newEmpId) || null;
    }
    if (!code && dryRun) {
      const orig = (dump.employees || []).find((e) => Number(e.id) === Number(s.employee_id));
      code =
        (orig?.branch_id != null ? skadiBranchCode.get(Number(orig.branch_id)) : null) ||
        targetBranchCode({ branch_name: orig?.branch_name || "" });
    }
    if (!code) {
      schSkipped += 1;
      continue;
    }
    const branch = targets[code];
    const workType = WORK_TYPE_MAP[s.work_type] || WorkType.OPEN;
    const workDate = asDate(s.work_date);
    if (!workDate) {
      schSkipped += 1;
      continue;
    }

    if (dryRun) {
      schCreated += 1;
      continue;
    }

    const shift = await shiftFor(branch.id, s.work_type);
    const employeeName =
      (s.employee_name || "").trim() || empNameById.get(newEmpId) || "직원";
    const dateKey = workDate.toISOString().slice(0, 10);
    const key = `${branch.id}|${newEmpId}|${dateKey}|${workType}`;

    const payload: SchedulePayload = {
      branchId: branch.id,
      employeeId: newEmpId,
      employeeName,
      workType,
      shiftId: shift?.id ?? null,
      shiftName: shift?.name ?? s.work_type,
      workDate,
      startTime: asTime(s.start_time),
      endTime: asTime(s.end_time),
      workHours: s.work_hours != null ? Number(s.work_hours) : null,
      createdBy: "skadi-migrate",
      updatedBy: "skadi-migrate",
    };

    const existingId = existingKey.get(key);
    if (existingId) {
      toUpdate.push({ id: existingId, data: payload });
    } else {
      toCreate.push(payload);
      existingKey.set(key, -1); // dedupe within dump
    }
  }

  if (!dryRun) {
    const CHUNK = 200;
    for (let i = 0; i < toCreate.length; i += CHUNK) {
      const chunk = toCreate.slice(i, i + CHUNK);
      const result = await prisma.schedule.createMany({ data: chunk });
      schCreated += result.count;
      console.log(`  schedules createMany ${i + chunk.length}/${toCreate.length}`);
    }
    for (let i = 0; i < toUpdate.length; i += CHUNK) {
      const chunk = toUpdate.slice(i, i + CHUNK);
      await prisma.$transaction(chunk.map((row) => prisma.schedule.update({ where: { id: row.id }, data: row.data })));
      schUpdated += chunk.length;
      console.log(`  schedules update ${i + chunk.length}/${toUpdate.length}`);
    }
  }

  console.log(
    `Done employees created=${empCreated} updated=${empUpdated} skipped=${empSkipped}; schedules created=${schCreated} updated=${schUpdated} skipped=${schSkipped}`,
  );
  console.log(`Password for migrated staff: ${DEFAULT_PASSWORD}`);
  if (dryRun) console.log("Dry-run only. Re-run without --dry-run to apply.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
