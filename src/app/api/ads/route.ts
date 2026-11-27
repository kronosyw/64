import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureBranch, jsonError, jsonOk, parseBranchId, requireApiOps } from "@/lib/api";
import { calcAdMetrics, summarizeCosts } from "@/lib/ads";
import {
  adStoreListOrder,
  mergeDuplicateOwnStoresIfNeeded,
  normalizeStoreSortOrders,
  prevReviewCountByStore,
} from "@/lib/ad-stores";

function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { start, end };
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiOps();
    const type = req.nextUrl.searchParams.get("type") || "overview";
    const year = Number(req.nextUrl.searchParams.get("year") || new Date().getFullYear());
    const month = Number(req.nextUrl.searchParams.get("month") || new Date().getMonth() + 1);
    const { start, end } = monthRange(year, month);

    if (type === "platforms") {
      const platforms = await prisma.adPlatform.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      });
      return jsonOk({ platforms });
    }

    const branchId = parseBranchId(req.nextUrl.searchParams.get("branchId"), session.user.branchIds);
    if (!branchId) return jsonError("지점 없음", 403);

    if (type === "stores") {
      const storeType = req.nextUrl.searchParams.get("storeType");
      const stores = await prisma.adStore.findMany({
        where: {
          branchId,
          isActive: true,
          ...(storeType === "OWN" || storeType === "COMPETITOR" ? { storeType } : {}),
        },
        include: { platform: true },
        orderBy: adStoreListOrder,
      });
      return jsonOk({ stores });
    }

    if (type === "cost") {
      const id = Number(req.nextUrl.searchParams.get("id"));
      const cost = await prisma.adCost.findFirst({
        where: { id, branchId },
        include: { store: true, platform: true },
      });
      if (!cost) return jsonError("없음", 404);
      return jsonOk({ cost });
    }

    if (type === "costs") {
      const platformId = req.nextUrl.searchParams.get("platformId");
      const storeId = req.nextUrl.searchParams.get("storeId");
      const costs = await prisma.adCost.findMany({
        where: {
          branchId,
          costDate: { gte: start, lte: end },
          ...(platformId ? { platformId: Number(platformId) } : {}),
          ...(storeId ? { storeId: Number(storeId) } : {}),
          OR: [
            { adSpend: { gt: 0 } },
            { impressions: { gt: 0 } },
            { clicks: { gt: 0 } },
            { orders: { gt: 0 } },
            { orderAmount: { gt: 0 } },
          ],
        },
        orderBy: [{ costDate: "desc" }, { id: "desc" }],
        include: { store: true, platform: true },
      });
      return jsonOk({ costs, summary: summarizeCosts(costs), year, month, branchId });
    }

    if (type === "reviews") {
      const [, stores, reviews, prevByStore] = await Promise.all([
        mergeDuplicateOwnStoresIfNeeded(branchId),
        prisma.adStore.findMany({
          where: { branchId, isActive: true },
          include: { platform: true },
          orderBy: adStoreListOrder,
        }),
        prisma.adReview.findMany({
          where: {
            store: { branchId },
            reviewDate: { gte: start, lte: end },
          },
          select: {
            id: true,
            storeId: true,
            reviewDate: true,
            reviewCount: true,
          },
          orderBy: { reviewDate: "asc" },
        }),
        prevReviewCountByStore(branchId, start),
      ]);
      return jsonOk({ stores, reviews, prevByStore, year, month });
    }

    if (type === "stats" || type === "review_stats" || type === "ad_stats" || type === "monthly_summary") {
      const yearStart = new Date(Date.UTC(year, 0, 1));
      const yearEnd = new Date(Date.UTC(year, 11, 31));
      const [costs, yearCosts, reviews, yearReviews, stores] = await Promise.all([
        prisma.adCost.findMany({
          where: { branchId, costDate: { gte: start, lte: end } },
          include: { platform: true, store: true },
        }),
        prisma.adCost.findMany({
          where: { branchId, costDate: { gte: yearStart, lte: yearEnd } },
          include: { platform: true, store: true },
        }),
        prisma.adReview.findMany({
          where: { store: { branchId }, reviewDate: { gte: start, lte: end } },
          include: { store: true },
          orderBy: { reviewDate: "asc" },
        }),
        prisma.adReview.findMany({
          where: {
            store: { branchId, storeType: "OWN", isActive: true },
            reviewDate: { gte: yearStart, lte: yearEnd },
          },
          include: { store: true },
        }),
        prisma.adStore.findMany({ where: { branchId, isActive: true }, include: { platform: true } }),
      ]);

      const reviewGrowth = stores
        .map((store) => {
          const rows = reviews.filter((r) => r.storeId === store.id).map((r) => r.reviewCount);
          if (rows.length === 0) {
            return {
              storeId: store.id,
              storeName: store.name,
              storeType: store.storeType,
              platformName: store.platform.name,
              colorCode: store.platform.colorCode,
              growth: 0,
              start: 0,
              end: 0,
              dataDays: 0,
            };
          }
          const startCount = Math.min(...rows);
          const endCount = Math.max(...rows);
          return {
            storeId: store.id,
            storeName: store.name,
            storeType: store.storeType,
            platformName: store.platform.name,
            colorCode: store.platform.colorCode,
            growth: endCount - startCount,
            start: startCount,
            end: endCount,
            dataDays: rows.length,
          };
        })
        .sort((a, b) => b.growth - a.growth);

      const byPlatform = new Map<
        string,
        {
          name: string;
          spend: number;
          orderAmount: number;
          impressions: number;
          clicks: number;
          orders: number;
          colorCode?: string;
        }
      >();
      for (const cost of costs) {
        const key = cost.platform.name;
        const cur = byPlatform.get(key) || {
          name: key,
          spend: 0,
          orderAmount: 0,
          impressions: 0,
          clicks: 0,
          orders: 0,
          colorCode: cost.platform.colorCode,
        };
        cur.spend += cost.adSpend;
        cur.orderAmount += cost.orderAmount;
        cur.impressions += cost.impressions;
        cur.clicks += cost.clicks;
        cur.orders += cost.orders;
        byPlatform.set(key, cur);
      }
      const platformStats = [...byPlatform.values()].map((v) => ({
        ...v,
        ...calcAdMetrics({
          adSpend: v.spend,
          impressions: v.impressions,
          clicks: v.clicks,
          orders: v.orders,
          orderAmount: v.orderAmount,
        }),
        roas: v.spend > 0 ? Math.round((v.orderAmount / v.spend) * 10000) / 100 : 0,
      }));

      const storeAdStats = stores
        .filter((s) => s.storeType === "OWN")
        .map((store) => {
          const rows = costs.filter((c) => c.storeId === store.id);
          const totals = summarizeCosts(rows);
          return {
            storeId: store.id,
            storeName: store.name,
            platformName: store.platform.name,
            colorCode: store.platform.colorCode,
            ...totals,
            dataDays: rows.length,
          };
        })
        .filter((s) => s.dataDays > 0)
        .sort((a, b) => b.adSpend - a.adSpend);

      const dailyMap = costs.reduce(
        (acc, cost) => {
          const day = String(cost.costDate).slice(0, 10);
          if (!acc[day]) acc[day] = { date: day, spend: 0, orderAmount: 0 };
          acc[day].spend += cost.adSpend;
          acc[day].orderAmount += cost.orderAmount;
          return acc;
        },
        {} as Record<string, { date: string; spend: number; orderAmount: number }>,
      );
      const dailyTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

      const adTrendByMonth = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const rows = yearCosts.filter((c) => new Date(c.costDate).getUTCMonth() + 1 === m);
        const totals = summarizeCosts(rows);
        return {
          month: `${year}-${String(m).padStart(2, "0")}`,
          totalAdSpend: totals.adSpend,
          totalOrderAmount: totals.orderAmount,
          totalOrders: totals.orders,
        };
      });

      const reviewTrendByMonth = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const ownStores = stores.filter((s) => s.storeType === "OWN");
        return ownStores.map((store) => {
          const rows = yearReviews
            .filter((r) => r.storeId === store.id && new Date(r.reviewDate).getUTCMonth() + 1 === m)
            .map((r) => r.reviewCount);
          const growth = rows.length ? Math.max(...rows) - Math.min(...rows) : 0;
          return {
            month: `${year}-${String(m).padStart(2, "0")}`,
            storeId: store.id,
            storeName: store.name,
            monthlyGrowth: growth,
          };
        });
      }).flat();

      if (type === "review_stats") return jsonOk({ year, month, stats: reviewGrowth });
      if (type === "ad_stats") return jsonOk({ year, month, stats: storeAdStats, platformStats });
      if (type === "monthly_summary") {
        return jsonOk({ year, adTrend: adTrendByMonth, reviewTrend: reviewTrendByMonth });
      }

      return jsonOk({
        year,
        month,
        summary: summarizeCosts(costs),
        platformStats,
        storeAdStats,
        reviewGrowth,
        dailyTrend,
        adTrend: adTrendByMonth,
        reviewTrend: reviewTrendByMonth,
      });
    }

    const [stores, costs, exposures, reviews] = await Promise.all([
      prisma.adStore.findMany({
        where: { branchId, isActive: true },
        include: { platform: true },
        orderBy: { name: "asc" },
      }),
      prisma.adCost.findMany({
        where: { branchId, costDate: { gte: start, lte: end } },
        orderBy: { costDate: "desc" },
        include: { store: true, platform: true },
      }),
      prisma.adExposure.findMany({
        where: { branchId, exposureDate: { gte: start, lte: end } },
        orderBy: { exposureDate: "desc" },
      }),
      prisma.adReview.findMany({
        where: { store: { branchId }, reviewDate: { gte: start, lte: end } },
        orderBy: { reviewDate: "desc" },
        include: { store: true },
      }),
    ]);

    return jsonOk({
      branchId,
      year,
      month,
      stores,
      costs,
      exposures,
      reviews,
      summary: summarizeCosts(costs),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("광고 조회 실패", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiOps();
    const body = await req.json();
    const action = String(body.action || "");

    if (action === "platform") {
      const code = String(body.code || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "");
      const name = String(body.name || "").trim();
      if (!code || !name) return jsonError("플랫폼 코드와 이름이 필요합니다.");
      const platform = await prisma.adPlatform.upsert({
        where: { code },
        create: {
          code,
          name,
          colorCode: String(body.colorCode || "#3B82F6"),
          sortOrder: Number(body.sortOrder || 99),
        },
        update: {
          name,
          colorCode: String(body.colorCode || "#3B82F6"),
          isActive: true,
        },
      });
      return jsonOk({ platform }, 201);
    }

    if (action === "store") {
      const branchId = Number(body.branchId);
      ensureBranch(session.user.branchIds, branchId);
      const payload = {
        branchId,
        platformId: Number(body.platformId),
        name: String(body.name || "").trim(),
        storeType: (body.storeType === "OWN" ? "OWN" : "COMPETITOR") as "OWN" | "COMPETITOR",
        address: (body.address as string) || null,
        notes: (body.notes as string) || null,
      };
      if (!payload.name) return jsonError("점포명이 필요합니다.");
      if (body.id) {
        const existing = await prisma.adStore.findUnique({ where: { id: Number(body.id) } });
        if (!existing) return jsonError("점포 없음", 404);
        ensureBranch(session.user.branchIds, existing.branchId);
        const store = await prisma.adStore.update({
          where: { id: existing.id },
          data: {
            platformId: payload.platformId,
            name: payload.name,
            storeType: payload.storeType,
            address: payload.address,
            notes: payload.notes,
            isActive: true,
          },
        });
        return jsonOk({ store });
      }
      const maxSort = await prisma.adStore.aggregate({
        where: { branchId, platformId: payload.platformId },
        _max: { sortOrder: true },
      });
      const store = await prisma.adStore.create({
        data: { ...payload, sortOrder: (maxSort._max.sortOrder ?? 0) + 10 },
      });
      return jsonOk({ store }, 201);
    }

    if (action === "reorder_store") {
      const branchId = Number(body.branchId);
      const storeId = Number(body.storeId);
      const direction = body.direction === "down" ? "down" : "up";
      ensureBranch(session.user.branchIds, branchId);
      const current = await prisma.adStore.findUnique({ where: { id: storeId } });
      if (!current || current.branchId !== branchId) return jsonError("점포 없음", 404);

      await normalizeStoreSortOrders(branchId, current.platformId);

      const peers = await prisma.adStore.findMany({
        where: { branchId, platformId: current.platformId, isActive: true },
        orderBy: adStoreListOrder,
      });
      const idx = peers.findIndex((s) => s.id === storeId);
      if (idx < 0) return jsonError("점포 없음", 404);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= peers.length) return jsonOk({ stores: peers });

      const a = peers[idx];
      const b = peers[swapIdx];
      const aOrder = a.sortOrder;
      const bOrder = b.sortOrder;
      await prisma.$transaction([
        prisma.adStore.update({ where: { id: a.id }, data: { sortOrder: bOrder } }),
        prisma.adStore.update({ where: { id: b.id }, data: { sortOrder: aOrder } }),
      ]);

      const stores = await prisma.adStore.findMany({
        where: { branchId, isActive: true },
        include: { platform: true },
        orderBy: adStoreListOrder,
      });
      return jsonOk({ stores });
    }

    if (action === "cost") {
      const branchId = Number(body.branchId);
      ensureBranch(session.user.branchIds, branchId);
      const adSpend = Number(body.adSpend || 0);
      const impressions = Number(body.impressions || 0);
      const clicks = Number(body.clicks || 0);
      const orders = Number(body.orders || 0);
      const orderAmount = Number(body.orderAmount || 0);
      const metrics = calcAdMetrics({ adSpend, impressions, clicks, orders, orderAmount });
      const memo = body.memo != null ? String(body.memo).slice(0, 5) : undefined;
      const checkTime = body.checkTime != null ? String(body.checkTime).slice(0, 10) : undefined;

      if (body.id) {
        const existing = await prisma.adCost.findUnique({ where: { id: Number(body.id) } });
        if (!existing) return jsonError("광고비 없음", 404);
        ensureBranch(session.user.branchIds, existing.branchId);
        const cost = await prisma.adCost.update({
          where: { id: existing.id },
          data: {
            adSpend,
            impressions,
            clicks,
            orders,
            orderAmount,
            ...metrics,
            notes: body.notes || null,
            ...(memo !== undefined ? { memo } : {}),
            ...(checkTime !== undefined ? { checkTime } : {}),
          },
        });
        return jsonOk({ cost });
      }

      const cost = await prisma.adCost.upsert({
        where: {
          storeId_costDate: {
            storeId: Number(body.storeId),
            costDate: new Date(body.costDate),
          },
        },
        create: {
          branchId,
          platformId: Number(body.platformId),
          storeId: Number(body.storeId),
          costDate: new Date(body.costDate),
          adSpend,
          impressions,
          clicks,
          orders,
          orderAmount,
          ...metrics,
          notes: body.notes || null,
          memo: memo ?? null,
          checkTime: checkTime ?? null,
        },
        update: {
          adSpend,
          impressions,
          clicks,
          orders,
          orderAmount,
          ...metrics,
          notes: body.notes || null,
          ...(memo !== undefined ? { memo } : {}),
          ...(checkTime !== undefined ? { checkTime } : {}),
        },
      });
      return jsonOk({ cost });
    }

    if (action === "review") {
      const store = await prisma.adStore.findUnique({ where: { id: Number(body.storeId) } });
      if (!store) return jsonError("점포 없음", 404);
      ensureBranch(session.user.branchIds, store.branchId);
      const review = await prisma.adReview.upsert({
        where: {
          storeId_reviewDate: {
            storeId: Number(body.storeId),
            reviewDate: new Date(body.reviewDate),
          },
        },
        create: {
          storeId: Number(body.storeId),
          reviewDate: new Date(body.reviewDate),
          reviewCount: Number(body.reviewCount || 0),
          ratingAvg: body.ratingAvg ? Number(body.ratingAvg) : null,
          notes: body.notes || null,
        },
        update: {
          reviewCount: Number(body.reviewCount || 0),
          ratingAvg: body.ratingAvg ? Number(body.ratingAvg) : null,
          notes: body.notes || null,
        },
      });
      return jsonOk({ review });
    }

    if (action === "bulk_reviews") {
      const branchId = Number(body.branchId);
      ensureBranch(session.user.branchIds, branchId);
      const reviewDate = String(body.reviewDate || "").slice(0, 10);
      if (!reviewDate) return jsonError("날짜가 필요합니다.");
      const rows = Array.isArray(body.rows) ? body.rows : [];
      let saved = 0;
      for (const row of rows) {
        const storeId = Number(row.storeId);
        const store = await prisma.adStore.findFirst({ where: { id: storeId, branchId } });
        if (!store) continue;
        if (row.reviewCount === "" || row.reviewCount == null) continue;
        await prisma.adReview.upsert({
          where: { storeId_reviewDate: { storeId, reviewDate: new Date(reviewDate) } },
          create: {
            storeId,
            reviewDate: new Date(reviewDate),
            reviewCount: Number(row.reviewCount || 0),
            ratingAvg: row.ratingAvg ? Number(row.ratingAvg) : null,
          },
          update: {
            reviewCount: Number(row.reviewCount || 0),
            ratingAvg: row.ratingAvg ? Number(row.ratingAvg) : null,
          },
        });
        saved += 1;
      }
      return jsonOk({ saved });
    }

    if (action === "exposure") {
      const branchId = Number(body.branchId);
      ensureBranch(session.user.branchIds, branchId);
      const exposure = await prisma.adExposure.create({
        data: {
          branchId,
          regionName: String(body.regionName || "").trim(),
          exposureDate: new Date(body.exposureDate),
          keyword: body.keyword || null,
          rank: body.rank === "" || body.rank == null ? null : Number(body.rank),
          notes: body.notes || null,
        },
      });
      return jsonOk({ exposure }, 201);
    }

    return jsonError("알 수 없는 action");
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError(e instanceof Error ? e.message : "광고 저장 실패", 400);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireApiOps();
    const type = req.nextUrl.searchParams.get("type");
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!type || !id) return jsonError("type과 id가 필요합니다.");

    if (type === "store") {
      const store = await prisma.adStore.findUnique({ where: { id } });
      if (!store) return jsonError("없음", 404);
      ensureBranch(session.user.branchIds, store.branchId);
      await prisma.adStore.update({ where: { id }, data: { isActive: false } });
      return jsonOk({ deleted: true });
    }

    if (type === "cost") {
      const cost = await prisma.adCost.findUnique({ where: { id } });
      if (!cost) return jsonError("없음", 404);
      ensureBranch(session.user.branchIds, cost.branchId);
      await prisma.adCost.delete({ where: { id } });
      return jsonOk({ deleted: true });
    }

    if (type === "review") {
      const review = await prisma.adReview.findUnique({
        where: { id },
        include: { store: true },
      });
      if (!review) return jsonError("없음", 404);
      ensureBranch(session.user.branchIds, review.store.branchId);
      await prisma.adReview.delete({ where: { id } });
      return jsonOk({ deleted: true });
    }

    if (type === "exposure") {
      const exposure = await prisma.adExposure.findUnique({ where: { id } });
      if (!exposure) return jsonError("없음", 404);
      ensureBranch(session.user.branchIds, exposure.branchId);
      await prisma.adExposure.delete({ where: { id } });
      return jsonOk({ deleted: true });
    }

    return jsonError("알 수 없는 type");
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError(e instanceof Error ? e.message : "광고 삭제 실패", 400);
  }
}
