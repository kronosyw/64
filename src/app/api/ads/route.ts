import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureBranch, jsonError, jsonOk, parseBranchId, requireApiOps } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiOps();
    const branchId = parseBranchId(req.nextUrl.searchParams.get("branchId"), session.user.branchIds);
    if (!branchId) return jsonError("지점 없음", 403);
    const type = req.nextUrl.searchParams.get("type") || "overview";

    if (type === "platforms") {
      const platforms = await prisma.adPlatform.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      });
      return jsonOk({ platforms });
    }

    const [stores, costs, exposures, reviews] = await Promise.all([
      prisma.adStore.findMany({
        where: { branchId, isActive: true },
        include: { platform: true },
        orderBy: { name: "asc" },
      }),
      prisma.adCost.findMany({
        where: { branchId },
        orderBy: { costDate: "desc" },
        take: 60,
        include: { store: true, platform: true },
      }),
      prisma.adExposure.findMany({
        where: { branchId },
        orderBy: { exposureDate: "desc" },
        take: 60,
      }),
      prisma.adReview.findMany({
        where: { store: { branchId } },
        orderBy: { reviewDate: "desc" },
        take: 60,
        include: { store: true },
      }),
    ]);

    return jsonOk({ branchId, stores, costs, exposures, reviews });
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
      const ctr = impressions ? (clicks / impressions) * 100 : 0;
      const cvr = clicks ? (orders / clicks) * 100 : 0;
      const cpc = clicks ? Math.round(adSpend / clicks) : 0;
      const cpa = orders ? Math.round(adSpend / orders) : 0;
      const roas = adSpend ? (orderAmount / adSpend) * 100 : 0;

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
          ctr,
          cvr,
          cpc,
          cpa,
          roas,
          notes: body.notes || null,
        },
        update: {
          adSpend,
          impressions,
          clicks,
          orders,
          orderAmount,
          ctr,
          cvr,
          cpc,
          cpa,
          roas,
          notes: body.notes || null,
        },
      });
      return jsonOk({ cost });
    }

    if (action === "review") {
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

    if (action === "exposure") {
      const branchId = Number(body.branchId);
      ensureBranch(session.user.branchIds, branchId);
      const exposure = await prisma.adExposure.create({
        data: {
          branchId,
          regionName: String(body.regionName || "").trim(),
          exposureDate: new Date(body.exposureDate),
          keyword: body.keyword || null,
          rank: body.rank ? Number(body.rank) : null,
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
