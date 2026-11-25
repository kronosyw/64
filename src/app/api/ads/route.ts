import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureBranch, jsonError, jsonOk, parseBranchId, requireApiOps } from "@/lib/api";
import { calcAdMetrics, summarizeCosts } from "@/lib/ads";

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

    if (type === "costs") {
      const costs = await prisma.adCost.findMany({
        where: {
          branchId,
          costDate: { gte: start, lte: end },
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
      const stores = await prisma.adStore.findMany({
        where: { branchId, isActive: true },
        include: { platform: true },
        orderBy: [{ storeType: "asc" }, { name: "asc" }],
      });
      const reviews = await prisma.adReview.findMany({
        where: {
          store: { branchId },
          reviewDate: { gte: start, lte: end },
        },
        include: { store: true },
        orderBy: { reviewDate: "asc" },
      });
      const prev = await prisma.adReview.findMany({
        where: {
          store: { branchId },
          reviewDate: { lt: start },
        },
        orderBy: { reviewDate: "desc" },
      });
      const prevByStore = new Map<number, number>();
      for (const row of prev) {
        if (!prevByStore.has(row.storeId)) prevByStore.set(row.storeId, row.reviewCount);
      }
      return jsonOk({ stores, reviews, prevByStore: Object.fromEntries(prevByStore), year, month });
    }

    if (type === "stats") {
      const [costs, reviews, stores] = await Promise.all([
        prisma.adCost.findMany({
          where: { branchId, costDate: { gte: start, lte: end } },
          include: { platform: true, store: true },
        }),
        prisma.adReview.findMany({
          where: { store: { branchId }, reviewDate: { gte: start, lte: end } },
          include: { store: true },
          orderBy: { reviewDate: "asc" },
        }),
        prisma.adStore.findMany({ where: { branchId, isActive: true }, include: { platform: true } }),
      ]);
      const byPlatform = new Map<string, { spend: number; orderAmount: number }>();
      for (const cost of costs) {
        const key = cost.platform.name;
        const cur = byPlatform.get(key) || { spend: 0, orderAmount: 0 };
        cur.spend += cost.adSpend;
        cur.orderAmount += cost.orderAmount;
        byPlatform.set(key, cur);
      }
      const reviewGrowth = stores.map((store) => {
        const rows = reviews.filter((r) => r.storeId === store.id);
        const first = rows[0]?.reviewCount ?? 0;
        const last = rows[rows.length - 1]?.reviewCount ?? first;
        return {
          storeId: store.id,
          storeName: store.name,
          platformName: store.platform.name,
          growth: last - first,
          start: first,
          end: last,
        };
      });
      return jsonOk({
        year,
        month,
        summary: summarizeCosts(costs),
        platformStats: [...byPlatform.entries()].map(([name, v]) => ({
          name,
          spend: v.spend,
          orderAmount: v.orderAmount,
          roas: v.spend > 0 ? Math.round((v.orderAmount / v.spend) * 10000) / 100 : 0,
        })),
        reviewGrowth: reviewGrowth.sort((a, b) => b.growth - a.growth),
        dailySpend: Object.values(
          costs.reduce(
            (acc, cost) => {
              const day = String(cost.costDate).slice(0, 10);
              acc[day] = (acc[day] || 0) + cost.adSpend;
              return acc;
            },
            {} as Record<string, number>,
          ),
        ),
        dailyTrend: Object.entries(
          costs.reduce(
            (acc, cost) => {
              const day = String(cost.costDate).slice(0, 10);
              acc[day] = (acc[day] || 0) + cost.adSpend;
              return acc;
            },
            {} as Record<string, number>,
          ),
        )
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, spend]) => ({ date, spend })),
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

    if (action === "store") {
      const branchId = Number(body.branchId);
      ensureBranch(session.user.branchIds, branchId);
      const store = await prisma.adStore.create({
        data: {
          branchId,
          platformId: Number(body.platformId),
          name: String(body.name || "").trim(),
          storeType: body.storeType === "OWN" ? "OWN" : "COMPETITOR",
          address: body.address || null,
          notes: body.notes || null,
        },
      });
      return jsonOk({ store }, 201);
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
      }
      return jsonOk({ saved: true });
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
