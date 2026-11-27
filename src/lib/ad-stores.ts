import { prisma } from "@/lib/prisma";
import type { AdStore, StoreType } from "@prisma/client";

const OWN_NAME_ALIASES: Record<string, string> = {
  송파: "육식사관학교 송파점",
  송파점: "육식사관학교 송파점",
  분당야탑: "육식사관학교 분당야탑점",
  야탑점: "육식사관학교 분당야탑점",
};

/** SKADI short own-store names → display canonical name. */
export function canonicalOwnStoreName(name: string) {
  const trimmed = String(name || "").trim();
  return OWN_NAME_ALIASES[trimmed] || trimmed;
}

export function filterAdsBranches<T extends { id: number; name: string; code?: string | null }>(branches: T[]): T[] {
  const hasSp01 = branches.some((b) => b.code === "SP01");
  const hasYt01 = branches.some((b) => b.code === "YT01");
  return branches.filter((b) => {
    if (hasSp01 && b.code !== "SP01" && /송파/.test(b.name)) return false;
    if (hasYt01 && b.code !== "YT01" && /야탑|분당/.test(b.name)) return false;
    return true;
  });
}

function pickPreferredOwnStore(stores: AdStore[]) {
  return stores.reduce((best, cur) => {
    const curCanon = canonicalOwnStoreName(cur.name);
    const bestCanon = canonicalOwnStoreName(best.name);
    if (cur.name === curCanon && best.name !== bestCanon) return cur;
    if (best.name === bestCanon && cur.name !== curCanon) return best;
    if (cur.name.length > best.name.length) return cur;
    if (best.name.length > cur.name.length) return best;
    return cur.id < best.id ? cur : best;
  });
}

/** Latest review count per store strictly before a date (Postgres DISTINCT ON). */
export async function prevReviewCountByStore(branchId: number, before: Date) {
  const rows = await prisma.$queryRaw<Array<{ store_id: number; review_count: number }>>`
    SELECT DISTINCT ON (ar.store_id) ar.store_id, ar.review_count
    FROM ad_reviews ar
    INNER JOIN ad_stores s ON s.id = ar.store_id
    WHERE s.branch_id = ${branchId}
      AND ar.review_date < ${before}
    ORDER BY ar.store_id, ar.review_date DESC
  `;
  const out: Record<string, number> = {};
  for (const row of rows) out[String(row.store_id)] = row.review_count;
  return out;
}

function duplicateOwnGroups(ownStores: Pick<AdStore, "id" | "platformId" | "name">[]) {
  const byKey = new Map<string, number[]>();
  for (const s of ownStores) {
    const key = `${s.platformId}:${canonicalOwnStoreName(s.name)}`;
    const ids = byKey.get(key) || [];
    ids.push(s.id);
    byKey.set(key, ids);
  }
  return [...byKey.values()].filter((ids) => ids.length > 1);
}

/** Run heavy merge only when duplicate OWN rows exist for the same platform+canonical name. */
export async function mergeDuplicateOwnStoresIfNeeded(branchId: number) {
  const ownStores = await prisma.adStore.findMany({
    where: { branchId, storeType: "OWN" as StoreType, isActive: true },
    select: { id: true, platformId: true, name: true },
  });
  if (!duplicateOwnGroups(ownStores).length) return;
  await mergeDuplicateOwnStores(branchId);
}

/** Merge duplicate OWN rows (송파·분당야탑 short names) into canonical store per platform. */
export async function mergeDuplicateOwnStores(branchId: number) {
  const ownStores = await prisma.adStore.findMany({
    where: { branchId, storeType: "OWN" as StoreType, isActive: true },
  });
  const byPlatform = new Map<number, AdStore[]>();
  for (const s of ownStores) {
    const list = byPlatform.get(s.platformId) || [];
    list.push(s);
    byPlatform.set(s.platformId, list);
  }

  for (const list of byPlatform.values()) {
    const byCanon = new Map<string, AdStore[]>();
    for (const s of list) {
      const key = canonicalOwnStoreName(s.name);
      const bucket = byCanon.get(key) || [];
      bucket.push(s);
      byCanon.set(key, bucket);
    }

    for (const [canon, dupes] of byCanon) {
      if (dupes.length < 2) {
        const only = dupes[0];
        if (only && only.name !== canon) {
          await prisma.adStore.update({ where: { id: only.id }, data: { name: canon } });
        }
        continue;
      }

      const keep = pickPreferredOwnStore(dupes);
      if (keep.name !== canon) {
        await prisma.adStore.update({ where: { id: keep.id }, data: { name: canon } });
      }

      for (const loser of dupes) {
        if (loser.id === keep.id) continue;

        const reviews = await prisma.adReview.findMany({ where: { storeId: loser.id } });
        for (const r of reviews) {
          const existing = await prisma.adReview.findUnique({
            where: { storeId_reviewDate: { storeId: keep.id, reviewDate: r.reviewDate } },
          });
          await prisma.adReview.upsert({
            where: {
              storeId_reviewDate: {
                storeId: keep.id,
                reviewDate: r.reviewDate,
              },
            },
            create: {
              storeId: keep.id,
              reviewDate: r.reviewDate,
              reviewCount: r.reviewCount,
              ratingAvg: r.ratingAvg,
              notes: r.notes,
            },
            update: {
              reviewCount: Math.max(existing?.reviewCount ?? 0, r.reviewCount),
              ratingAvg: r.ratingAvg ?? existing?.ratingAvg,
              notes: r.notes ?? existing?.notes,
            },
          });
        }

        const costs = await prisma.adCost.findMany({ where: { storeId: loser.id } });
        for (const c of costs) {
          const clash = await prisma.adCost.findUnique({
            where: { storeId_costDate: { storeId: keep.id, costDate: c.costDate } },
          });
          if (clash) {
            await prisma.adCost.delete({ where: { id: c.id } });
          } else {
            await prisma.adCost.update({ where: { id: c.id }, data: { storeId: keep.id } });
          }
        }

        await prisma.adStore.delete({ where: { id: loser.id } });
      }
    }
  }
}

export const adStoreListOrder = [
  { storeType: "asc" as const },
  { sortOrder: "asc" as const },
  { name: "asc" as const },
];

/** Ensures distinct sortOrder within a platform group (legacy rows often all 0). */
export async function normalizeStoreSortOrders(branchId: number, platformId: number) {
  const peers = await prisma.adStore.findMany({
    where: { branchId, platformId, isActive: true },
    orderBy: adStoreListOrder,
  });
  const needsNormalize =
    peers.length > 1 && peers.every((s) => s.sortOrder === peers[0]?.sortOrder);
  if (!needsNormalize) return;
  await prisma.$transaction(
    peers.map((s, i) =>
      prisma.adStore.update({ where: { id: s.id }, data: { sortOrder: (i + 1) * 10 } }),
    ),
  );
}