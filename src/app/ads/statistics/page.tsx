"use client";

import { useEffect, useState } from "react";
import { AdsStatCards } from "@/components/ads/AdsStatCards";
import { AdsSubnav } from "@/components/ads/AdsSubnav";
import { BarChart, DonutChart, LineChart } from "@/components/ads/SimpleCharts";
import { BranchSwitcher } from "@/components/ads/BranchSwitcher";
import { MonthNav } from "@/components/ads/MonthNav";
import { Message, Panel, TableShell } from "@/components/ui";
import { AdsBranch, formatNum, shiftYearMonth } from "@/lib/ads-ui";

type Summary = {
  adSpend: number;
  orders: number;
  orderAmount: number;
  roas: number;
};

type StatsPayload = {
  summary: Summary;
  reviewGrowth: Array<{
    storeName: string;
    platformName: string;
    storeType: string;
    growth: number;
    start: number;
    end: number;
    colorCode?: string;
  }>;
  platformStats: Array<{
    name: string;
    spend: number;
    orderAmount: number;
    roas: number;
    ctr: number;
    cvr: number;
    cpc: number;
    cpa: number;
    colorCode?: string;
  }>;
  dailyTrend: Array<{ date: string; spend: number; orderAmount: number }>;
  adTrend: Array<{ month: string; totalAdSpend: number; totalOrderAmount: number }>;
};

export default function AdsStatisticsPage() {
  const now = new Date();
  const [branches, setBranches] = useState<AdsBranch[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.branches?.length) {
          setBranches(data.branches);
          setBranchId((prev) => prev ?? data.branches[0].id);
        }
      });
  }, []);

  useEffect(() => {
    if (!branchId) return;
    fetch(`/api/ads?type=stats&branchId=${branchId}&year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setStats(data);
        else setMessage(data.message || "통계 로드 실패");
      });
  }, [branchId, year, month]);

  const ownGrowth = (stats?.reviewGrowth || []).filter((r) => r.storeType === "OWN");
  const avgRoas = stats?.summary?.roas ?? 0;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-panel border border-line bg-card shadow-[0_1px_0_rgba(12,35,64,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">광고통계</h1>
            <p className="mt-0.5 text-sm text-muted">월간 리뷰 성장과 광고 효율을 한눈에 봅니다.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BranchSwitcher branches={branches} value={branchId} onChange={setBranchId} />
            <MonthNav
              year={year}
              month={month}
              onPrev={() => {
                const n = shiftYearMonth(year, month, -1);
                setYear(n.year);
                setMonth(n.month);
              }}
              onNext={() => {
                const n = shiftYearMonth(year, month, 1);
                setYear(n.year);
                setMonth(n.month);
              }}
            />
          </div>
        </div>
        <div className="bg-paper/55 px-4 py-3">
          <AdsSubnav />
        </div>
      </section>
      {message ? <Message>{message}</Message> : null}

      <AdsStatCards
        items={[
          { label: "총 광고비", value: formatNum(Number(stats?.summary?.adSpend || 0)) },
          { label: "총 주문수", value: formatNum(Number(stats?.summary?.orders || 0)) },
          { label: "총 주문금액", value: formatNum(Number(stats?.summary?.orderAmount || 0)) },
          { label: "평균 ROAS %", value: formatNum(Number(avgRoas || 0)) },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="점포별 리뷰 증감">
          <BarChart
            items={(stats?.reviewGrowth || []).map((r) => ({
              label: r.storeName,
              value: r.growth,
            }))}
            color="#2AC1BC"
          />
        </Panel>
        <Panel title="광고비 vs 주문금액 (일별)">
          <LineChart
            items={(stats?.dailyTrend || []).map((d) => ({
              label: d.date,
              value: d.spend,
            }))}
          />
          <p className="mt-2 text-xs text-muted">실선: 일별 광고비</p>
        </Panel>
        <Panel title="플랫폼 ROAS">
          <DonutChart
            items={(stats?.platformStats || []).map((p) => ({
              label: p.name,
              value: p.roas,
              color: p.colorCode,
            }))}
          />
        </Panel>
        <Panel title="연간 월별 광고비">
          <BarChart
            items={(stats?.adTrend || []).map((m) => ({
              label: m.month.slice(5),
              value: m.totalAdSpend,
            }))}
            color="#0c2340"
          />
        </Panel>
      </div>

      <Panel title="점포별 리뷰 통계">
        <TableShell>
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-2 py-2">점포</th>
              <th className="px-2 py-2">플랫폼</th>
              <th className="px-2 py-2">유형</th>
              <th className="px-2 py-2">시작</th>
              <th className="px-2 py-2">종료</th>
              <th className="px-2 py-2">증감</th>
            </tr>
          </thead>
          <tbody>
            {(stats?.reviewGrowth || []).map((r) => (
              <tr key={`${r.storeName}-${r.platformName}`} className="border-b border-line/70 text-sm">
                <td className="px-2 py-1.5">{r.storeName}</td>
                <td className="px-2 py-1.5">{r.platformName}</td>
                <td className="px-2 py-1.5">{r.storeType === "OWN" ? "자사" : "경쟁"}</td>
                <td className="px-2 py-1.5 tabular-nums">{formatNum(r.start)}</td>
                <td className="px-2 py-1.5 tabular-nums">{formatNum(r.end)}</td>
                <td className={`px-2 py-1.5 tabular-nums ${r.growth >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {r.growth >= 0 ? "+" : ""}
                  {formatNum(r.growth)}
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
        {ownGrowth.length ? (
          <p className="mt-2 text-xs text-muted">자사 증감 합계 {formatNum(ownGrowth.reduce((s, r) => s + r.growth, 0))}</p>
        ) : null}
      </Panel>

      <Panel title="플랫폼별 광고 효율">
        <TableShell>
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-2 py-2">플랫폼</th>
              <th className="px-2 py-2">광고비</th>
              <th className="px-2 py-2">주문금액</th>
              <th className="px-2 py-2">CTR</th>
              <th className="px-2 py-2">CVR</th>
              <th className="px-2 py-2">CPC</th>
              <th className="px-2 py-2">CPA</th>
              <th className="px-2 py-2">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {(stats?.platformStats || []).map((p) => (
              <tr key={p.name} className="border-b border-line/70 text-sm">
                <td className="px-2 py-1.5">{p.name}</td>
                <td className="px-2 py-1.5 tabular-nums">{formatNum(p.spend)}</td>
                <td className="px-2 py-1.5 tabular-nums">{formatNum(p.orderAmount)}</td>
                <td className="px-2 py-1.5 tabular-nums">{p.ctr}</td>
                <td className="px-2 py-1.5 tabular-nums">{p.cvr}</td>
                <td className="px-2 py-1.5 tabular-nums">{formatNum(p.cpc)}</td>
                <td className="px-2 py-1.5 tabular-nums">{formatNum(p.cpa)}</td>
                <td className="px-2 py-1.5 tabular-nums">{p.roas}</td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Panel>
    </div>
  );
}
