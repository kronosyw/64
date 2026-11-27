/**
 * SKADI 64_ad_* → yuksa-64 Ad* migration (idempotent).
 *
 * Usage:
 *   npx tsx scripts/migrate-skadi-ads.ts --dry-run
 *   npx tsx scripts/migrate-skadi-ads.ts --file scripts/data/skadi-ads.json
 *
 * JSON shape:
 * {
 *   platforms: [{ platform_id, platform_name, platform_code, color_code, sort_order, is_active }],
 *   stores: [{ store_id, platform_id, store_name, store_type, address, notes, sort_order, is_active }],
 *   reviews: [{ store_id, review_date, review_count, rating_avg, notes }],
 *   costs: [{ platform_id, store_id, cost_date, ad_spend, impressions, clicks, orders, order_amount, ctr, cvr, cpc, cpa, roas, notes, memo, check_time }]
 * }
 */
import { Prisma, PrismaClient, StoreType } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { calcAdMetrics } from "../src/lib/ads";

const prisma = new PrismaClient();
const BATCH = 250;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

type Dump = {
  platforms: Array<{
    platform_id: number;
    platform_name: string;
    platform_code: string;
    color_code?: string;
    sort_order?: number;
    is_active?: number | boolean;
  }>;
  stores: Array<{
    store_id: number;
    platform_id: number;
    store_name: string;
    store_type: string;
    address?: string | null;
    notes?: string | null;
    is_active?: number | boolean;
  }>;
  reviews: Array<{
    store_id: number;
    review_date: string;
    review_count: number;
    rating_avg?: number | null;
    notes?: string | null;
  }>;
  costs: Array<{
    platform_id: number;
    store_id: number;
    cost_date: string;
    ad_spend: number;
    impressions: number;
    clicks: number;
    orders: number;
    order_amount: number;
    ctr?: number;
    cvr?: number;
    cpc?: number;
    cpa?: number;
    roas?: number;
    notes?: string | null;
    memo?: string | null;
    check_time?: string | null;
  }>;
};

const BRANCH_NAMES = {
  SP01: "육식사관학교 송파점",
  YT01: "육식사관학교 분당야탑점",
} as const;

/** SKADI short names → yuksa display names (own stores + branches). */
const STORE_NAME_ALIASES: Record<string, string> = {
  송파: BRANCH_NAMES.SP01,
  분당야탑: BRANCH_NAMES.YT01,
  "육식사관학교 송파점": BRANCH_NAMES.SP01,
  "육식사관학교 분당야탑점": BRANCH_NAMES.YT01,
};

function canonicalStoreName(storeName: string): string {
  const trimmed = String(storeName || "").trim();
  return STORE_NAME_ALIASES[trimmed] || trimmed;
}

function ownBranchCode(storeName: string): "SP01" | "YT01" | null {
  const name = canonicalStoreName(storeName);
  if (name.includes("송파")) return "SP01";
  if (name.includes("야탑") || name.includes("분당")) return "YT01";
  return null;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const fileIdx = args.indexOf("--file");
  const file =
    fileIdx >= 0
      ? args[fileIdx + 1]
      : path.join(process.cwd(), "scripts/data/skadi-ads.json");
  return { dryRun, file };
}

async function ensureBranches() {
  const songpa = await prisma.branch.upsert({
    where: { code: "SP01" },
    update: { name: BRANCH_NAMES.SP01, isActive: true },
    create: { code: "SP01", name: BRANCH_NAMES.SP01, isActive: true },
  });
  const yatap = await prisma.branch.upsert({
    where: { code: "YT01" },
    update: { name: BRANCH_NAMES.YT01, isActive: true },
    create: { code: "YT01", name: BRANCH_NAMES.YT01, isActive: true },
  });
  return { SP01: songpa, YT01: yatap };
}

async function main() {
  const { dryRun, file } = parseArgs();
  if (!fs.existsSync(file)) {
    console.error(`Dump file not found: ${file}`);
    console.error("Export from SKADI with: php 64/ads/export_ads_json.php > scripts/data/skadi-ads.json");
    process.exit(1);
  }
  const dump = JSON.parse(fs.readFileSync(file, "utf8")) as Dump;
  const branches = dryRun
    ? ({
        SP01: { id: -1, code: "SP01", name: BRANCH_NAMES.SP01 },
        YT01: { id: -2, code: "YT01", name: BRANCH_NAMES.YT01 },
      } as Awaited<ReturnType<typeof ensureBranches>>)
    : await ensureBranches();
  const branchIds = [branches.SP01.id, branches.YT01.id];

  console.log(`Mode=${dryRun ? "DRY-RUN" : "APPLY"} file=${file}`);
  console.log(
    `Dump counts platforms=${dump.platforms?.length || 0} stores=${dump.stores?.length || 0} reviews=${dump.reviews?.length || 0} costs=${dump.costs?.length || 0}`,
  );

  // platform_id (skadi) -> code
  const platformCodeByOldId = new Map<number, string>();
  for (const p of dump.platforms || []) {
    const code = String(p.platform_code || "").trim().toLowerCase();
    platformCodeByOldId.set(Number(p.platform_id), code);
    console.log(`  platform ${p.platform_id} -> ${code} (${p.platform_name})`);
    if (!dryRun) {
      await prisma.adPlatform.upsert({
        where: { code },
        create: {
          code,
          name: p.platform_name,
          colorCode: p.color_code || "#3B82F6",
          sortOrder: Number(p.sort_order || 0),
          isActive: p.is_active === undefined ? true : Boolean(p.is_active),
        },
        update: {
          name: p.platform_name,
          colorCode: p.color_code || "#3B82F6",
          sortOrder: Number(p.sort_order || 0),
          isActive: p.is_active === undefined ? true : Boolean(p.is_active),
        },
      });
    }
  }

  const platformIdByCode = new Map<string, number>();
  if (dryRun) {
    let fakeId = 1;
    for (const code of platformCodeByOldId.values()) {
      if (!platformIdByCode.has(code)) platformIdByCode.set(code, fakeId++);
    }
  } else {
    const platforms = await prisma.adPlatform.findMany();
    for (const p of platforms) platformIdByCode.set(p.code, p.id);
  }

  // old store_id -> list of new store ids (competitors duplicated)
  const newStoreIdsByOld = new Map<number, number[]>();
  let storeCreates = 0;

  for (const s of dump.stores || []) {
    const code = platformCodeByOldId.get(Number(s.platform_id));
    const platformId = code ? platformIdByCode.get(code) : undefined;
    if (!platformId) {
      console.warn(`skip store ${s.store_id}: unknown platform ${s.platform_id}`);
      continue;
    }
    const isOwn = String(s.store_type).toLowerCase() === "own";
    const storeType: StoreType = isOwn ? "OWN" : "COMPETITOR";
    const storeName = canonicalStoreName(s.store_name);
    const nameAliases = Array.from(
      new Set(
        [storeName, String(s.store_name || "").trim()].filter(Boolean),
      ),
    );
    const targetBranchCodes = isOwn
      ? ([ownBranchCode(storeName)].filter(Boolean) as Array<"SP01" | "YT01">)
      : (["SP01", "YT01"] as const);

    if (isOwn && targetBranchCodes.length === 0) {
      console.warn(`skip own store ${storeName}: cannot map branch`);
      continue;
    }

    const createdIds: number[] = [];
    for (const branchCode of targetBranchCodes) {
      const branchId = branches[branchCode].id;
      if (dryRun) {
        console.log(
          `  store ${storeName} (${storeType}) -> branch ${branchCode} platform ${code}`,
        );
        storeCreates += 1;
        continue;
      }
      const existing = await prisma.adStore.findFirst({
        where: { branchId, platformId, name: { in: nameAliases } },
      });
      const row = existing
        ? await prisma.adStore.update({
            where: { id: existing.id },
            data: {
              name: storeName,
              storeType,
              address: s.address || null,
              notes: s.notes || null,
              sortOrder: Number(s.sort_order || 0),
              isActive: s.is_active === undefined ? true : Boolean(s.is_active),
            },
          })
        : await prisma.adStore.create({
            data: {
              branchId,
              platformId,
              name: storeName,
              storeType,
              address: s.address || null,
              notes: s.notes || null,
              sortOrder: Number(s.sort_order || 0),
              isActive: s.is_active === undefined ? true : Boolean(s.is_active),
            },
          });
      createdIds.push(row.id);
      storeCreates += 1;
    }
    if (!dryRun) newStoreIdsByOld.set(Number(s.store_id), createdIds);
  }

  const reviewRows: Array<{
    storeId: number;
    reviewDate: string;
    reviewCount: number;
    ratingAvg: number | null;
    notes: string | null;
  }> = [];
  for (const r of dump.reviews || []) {
    const targets = newStoreIdsByOld.get(Number(r.store_id)) || [];
    if (dryRun) {
      reviewRows.push({
        storeId: 0,
        reviewDate: String(r.review_date).slice(0, 10),
        reviewCount: 0,
        ratingAvg: null,
        notes: null,
      });
      continue;
    }
    for (const storeId of targets) {
      reviewRows.push({
        storeId,
        reviewDate: String(r.review_date).slice(0, 10),
        reviewCount: Number(r.review_count || 0),
        ratingAvg: r.rating_avg != null ? Number(r.rating_avg) : null,
        notes: r.notes || null,
      });
    }
  }
  let reviewUpserts = reviewRows.length;
  if (!dryRun) {
    for (const batch of chunk(reviewRows, BATCH)) {
      const values = Prisma.join(
        batch.map(
          (row) =>
            Prisma.sql`(${row.storeId}, ${row.reviewDate}::date, ${row.reviewCount}, ${row.ratingAvg}, ${row.notes}, NOW(), NOW())`,
        ),
      );
      await prisma.$executeRaw`
        INSERT INTO ad_reviews (store_id, review_date, review_count, rating_avg, notes, created_at, updated_at)
        VALUES ${values}
        ON CONFLICT (store_id, review_date) DO UPDATE SET
          review_count = EXCLUDED.review_count,
          rating_avg = EXCLUDED.rating_avg,
          notes = EXCLUDED.notes,
          updated_at = NOW()
      `;
    }
    console.log(`reviews upserted=${reviewUpserts}`);
  }

  const storeMeta = dryRun
    ? new Map<number, { branchId: number; platformId: number }>()
    : new Map(
        (
          await prisma.adStore.findMany({
            where: { id: { in: [...new Set([...newStoreIdsByOld.values()].flat())] } },
            select: { id: true, branchId: true, platformId: true },
          })
        ).map((s) => [s.id, { branchId: s.branchId, platformId: s.platformId }] as const),
      );

  const costRows: Array<{
    branchId: number;
    platformId: number;
    storeId: number;
    costDate: string;
    adSpend: number;
    impressions: number;
    clicks: number;
    orders: number;
    orderAmount: number;
    ctr: number;
    cvr: number;
    cpc: number;
    cpa: number;
    roas: number;
    notes: string | null;
    memo: string | null;
    checkTime: string | null;
  }> = [];
  for (const c of dump.costs || []) {
    const targets = newStoreIdsByOld.get(Number(c.store_id)) || [];
    const storeId = targets[0];
    if (dryRun) {
      costRows.push({
        branchId: 0,
        platformId: 0,
        storeId: 0,
        costDate: String(c.cost_date).slice(0, 10),
        adSpend: 0,
        impressions: 0,
        clicks: 0,
        orders: 0,
        orderAmount: 0,
        ctr: 0,
        cvr: 0,
        cpc: 0,
        cpa: 0,
        roas: 0,
        notes: null,
        memo: null,
        checkTime: null,
      });
      continue;
    }
    if (!storeId) {
      console.warn(`skip cost store=${c.store_id} date=${c.cost_date}: no mapped store`);
      continue;
    }
    const store = storeMeta.get(storeId);
    if (!store) continue;
    const code = platformCodeByOldId.get(Number(c.platform_id));
    const platformId = (code && platformIdByCode.get(code)) || store.platformId;
    const adSpend = Number(c.ad_spend || 0);
    const impressions = Number(c.impressions || 0);
    const clicks = Number(c.clicks || 0);
    const orders = Number(c.orders || 0);
    const orderAmount = Number(c.order_amount || 0);
    const metrics =
      c.ctr != null && c.cvr != null && c.cpc != null && c.cpa != null && c.roas != null
        ? {
            ctr: Number(c.ctr),
            cvr: Number(c.cvr),
            cpc: Number(c.cpc),
            cpa: Number(c.cpa),
            roas: Number(c.roas),
          }
        : calcAdMetrics({ adSpend, impressions, clicks, orders, orderAmount });
    costRows.push({
      branchId: store.branchId,
      platformId,
      storeId,
      costDate: String(c.cost_date).slice(0, 10),
      adSpend,
      impressions,
      clicks,
      orders,
      orderAmount,
      ...metrics,
      notes: c.notes || null,
      memo: c.memo ? String(c.memo).slice(0, 10) : null,
      checkTime: c.check_time ? String(c.check_time).slice(0, 10) : null,
    });
  }
  let costUpserts = costRows.length;
  if (!dryRun) {
    for (const batch of chunk(costRows, BATCH)) {
      const values = Prisma.join(
        batch.map(
          (row) =>
            Prisma.sql`(${row.branchId}, ${row.platformId}, ${row.storeId}, ${row.costDate}::date, ${row.adSpend}, ${row.impressions}, ${row.clicks}, ${row.orders}, ${row.orderAmount}, ${row.ctr}, ${row.cvr}, ${row.cpc}, ${row.cpa}, ${row.roas}, ${row.notes}, ${row.memo}, ${row.checkTime}, NOW(), NOW())`,
        ),
      );
      await prisma.$executeRaw`
        INSERT INTO ad_costs (
          branch_id, platform_id, store_id, cost_date, ad_spend, impressions, clicks, orders, order_amount,
          ctr, cvr, cpc, cpa, roas, notes, memo, check_time, created_at, updated_at
        )
        VALUES ${values}
        ON CONFLICT (store_id, cost_date) DO UPDATE SET
          branch_id = EXCLUDED.branch_id,
          platform_id = EXCLUDED.platform_id,
          ad_spend = EXCLUDED.ad_spend,
          impressions = EXCLUDED.impressions,
          clicks = EXCLUDED.clicks,
          orders = EXCLUDED.orders,
          order_amount = EXCLUDED.order_amount,
          ctr = EXCLUDED.ctr,
          cvr = EXCLUDED.cvr,
          cpc = EXCLUDED.cpc,
          cpa = EXCLUDED.cpa,
          roas = EXCLUDED.roas,
          notes = EXCLUDED.notes,
          memo = EXCLUDED.memo,
          check_time = EXCLUDED.check_time,
          updated_at = NOW()
      `;
    }
    console.log(`costs upserted=${costUpserts}`);
  }

  console.log(
    `Done storeOps=${storeCreates} reviewUpserts=${reviewUpserts} costUpserts=${costUpserts} branches=${branchIds.join(",")}`,
  );
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
