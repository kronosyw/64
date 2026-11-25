"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Field,
  Message,
  PageHeader,
  Panel,
  TableShell,
  Tabs,
  TextInput,
  TextSelect,
} from "@/components/ui";
import { calcAdMetrics } from "@/lib/ads";

type Branch = { id: number; name: string };
type Platform = { id: number; name: string; colorCode?: string };
type Store = {
  id: number;
  name: string;
  platformId: number;
  storeType: "OWN" | "COMPETITOR";
  platform?: Platform;
};
type Cost = {
  id: number;
  costDate: string;
  adSpend: number;
  impressions: number;
  clicks: number;
  orders: number;
  orderAmount: number;
  ctr: string | number;
  cvr: string | number;
  cpc: number;
  cpa: number;
  roas: string | number;
  memo: string | null;
  checkTime: string | null;
  store?: Store;
  platform?: Platform;
};
type Review = { id: number; storeId: number; reviewDate: string; reviewCount: number; store?: Store };
type Exposure = { id: number; exposureDate: string; regionName: string; rank: number | null; keyword: string | null };
type Summary = {
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
};
type Stats = {
  summary: Summary;
  platformStats: { name: string; spend: number; orderAmount: number; roas: number }[];
  reviewGrowth: { storeName: string; platformName: string; growth: number; start: number; end: number }[];
  dailyTrend: { date: string; spend: number }[];
};

const emptyCost = {
  storeId: "",
  costDate: "",
  adSpend: "",
  impressions: "",
  clicks: "",
  orders: "",
  orderAmount: "",
  notes: "",
  memo: "",
  checkTime: "",
};

export default function AdsPage() {
  const [tab, setTab] = useState<string | number>("costs");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(1);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [prevByStore, setPrevByStore] = useState<Record<string, number>>({});
  const [exposures, setExposures] = useState<Exposure[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [message, setMessage] = useState("");
  const [storeForm, setStoreForm] = useState({ name: "", platformId: "", storeType: "OWN" });
  const [costForm, setCostForm] = useState(emptyCost);
  const [reviewDate, setReviewDate] = useState("");
  const [reviewRows, setReviewRows] = useState<Record<number, string>>({});
  const [exposureForm, setExposureForm] = useState({
    regionName: "",
    exposureDate: "",
    rank: "",
    keyword: "",
  });

  const preview = useMemo(
    () =>
      calcAdMetrics({
        adSpend: Number(costForm.adSpend || 0),
        impressions: Number(costForm.impressions || 0),
        clicks: Number(costForm.clicks || 0),
        orders: Number(costForm.orders || 0),
        orderAmount: Number(costForm.orderAmount || 0),
      }),
    [costForm],
  );

  async function loadMeta() {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    setReviewDate(now.toISOString().slice(0, 10));
    setCostForm((f) => ({ ...f, costDate: now.toISOString().slice(0, 10) }));
    setExposureForm((f) => ({ ...f, exposureDate: now.toISOString().slice(0, 10) }));
    const [bRes, pRes] = await Promise.all([fetch("/api/branches"), fetch("/api/ads?type=platforms")]);
    const bData = await bRes.json();
    const pData = await pRes.json();
    if (bData.success && bData.branches.length) {
      setBranches(bData.branches);
      setBranchId(bData.branches[0].id);
    }
    if (pData.success) {
      setPlatforms(pData.platforms);
      if (pData.platforms[0]) setStoreForm((f) => ({ ...f, platformId: String(pData.platforms[0].id) }));
    }
  }

  async function loadAll(id: number, y: number, m: number) {
    const q = `branchId=${id}&year=${y}&month=${m}`;
    const [ov, costRes, reviewRes, statsRes] = await Promise.all([
      fetch(`/api/ads?${q}`).then((r) => r.json()),
      fetch(`/api/ads?type=costs&${q}`).then((r) => r.json()),
      fetch(`/api/ads?type=reviews&${q}`).then((r) => r.json()),
      fetch(`/api/ads?type=stats&${q}`).then((r) => r.json()),
    ]);
    if (ov.success) {
      setStores(ov.stores);
      setExposures(ov.exposures);
    }
    if (costRes.success) {
      setCosts(costRes.costs);
      setSummary(costRes.summary);
    }
    if (reviewRes.success) {
      setStores(reviewRes.stores);
      setReviews(reviewRes.reviews);
      setPrevByStore(reviewRes.prevByStore || {});
      const rows: Record<number, string> = {};
      for (const store of reviewRes.stores as Store[]) rows[store.id] = "";
      setReviewRows(rows);
    }
    if (statsRes.success) setStats(statsRes);
  }

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    if (branchId) loadAll(branchId, year, month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, year, month]);

  function shiftMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  async function addStore(e: FormEvent) {
    e.preventDefault();
    if (!branchId) return;
    const res = await fetch("/api/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "store",
        branchId,
        name: storeForm.name,
        platformId: Number(storeForm.platformId),
        storeType: storeForm.storeType,
      }),
    });
    const data = await res.json();
    setMessage(data.success ? "점포를 추가했습니다." : data.message || "실패");
    if (data.success) {
      setStoreForm({ ...storeForm, name: "" });
      loadAll(branchId, year, month);
    }
  }

  async function addCost(e: FormEvent) {
    e.preventDefault();
    if (!branchId) return;
    const store = stores.find((s) => s.id === Number(costForm.storeId));
    const res = await fetch("/api/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cost",
        branchId,
        storeId: Number(costForm.storeId),
        platformId: store?.platformId,
        costDate: costForm.costDate,
        adSpend: Number(costForm.adSpend || 0),
        impressions: Number(costForm.impressions || 0),
        clicks: Number(costForm.clicks || 0),
        orders: Number(costForm.orders || 0),
        orderAmount: Number(costForm.orderAmount || 0),
        notes: costForm.notes,
        memo: costForm.memo,
        checkTime: costForm.checkTime,
      }),
    });
    const data = await res.json();
    setMessage(data.success ? "광고비를 저장했습니다." : data.message || "실패");
    if (data.success) {
      setCostForm({ ...emptyCost, costDate: costForm.costDate });
      loadAll(branchId, year, month);
    }
  }

  async function saveReviews(e: FormEvent) {
    e.preventDefault();
    if (!branchId) return;
    const res = await fetch("/api/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "bulk_reviews",
        branchId,
        reviewDate,
        rows: Object.entries(reviewRows).map(([storeId, reviewCount]) => ({ storeId, reviewCount })),
      }),
    });
    const data = await res.json();
    setMessage(data.success ? "리뷰수를 저장했습니다." : data.message || "실패");
    if (data.success) loadAll(branchId, year, month);
  }

  async function addExposure(e: FormEvent) {
    e.preventDefault();
    if (!branchId) return;
    const res = await fetch("/api/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "exposure", branchId, ...exposureForm }),
    });
    const data = await res.json();
    setMessage(data.success ? "노출순위를 저장했습니다." : data.message || "실패");
    if (data.success) {
      setExposureForm({ ...exposureForm, regionName: "", rank: "", keyword: "" });
      loadAll(branchId, year, month);
    }
  }

  async function remove(type: string, id: number) {
    if (!confirm("삭제할까요?")) return;
    const res = await fetch(`/api/ads?type=${type}&id=${id}`, { method: "DELETE" });
    const data = await res.json();
    setMessage(data.success ? "삭제했습니다." : data.message || "삭제 실패");
    if (data.success && branchId) loadAll(branchId, year, month);
  }

  const ownStores = stores.filter((s) => s.storeType === "OWN");

  return (
    <div className="space-y-6">
      <PageHeader
        title="광고"
        description="리뷰·광고비·노출·통계를 지점 월 단위로 관리합니다."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <TextSelect className="w-auto" value={branchId ?? ""} onChange={(e) => setBranchId(Number(e.target.value))}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </TextSelect>
            <Button type="button" variant="ghost" size="sm" onClick={() => shiftMonth(-1)}>
              이전달
            </Button>
            <span className="text-sm font-medium text-ink">
              {year}년 {month}월
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => shiftMonth(1)}>
              다음달
            </Button>
          </div>
        }
      />

      <Tabs
        items={[
          { id: "costs", label: "광고비" },
          { id: "reviews", label: "리뷰분석" },
          { id: "exposure", label: "노출분석" },
          { id: "stats", label: "광고통계" },
          { id: "stores", label: "점포" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {message ? <Message tone="ok">{message}</Message> : null}

      {tab === "costs" ? (
        <div className="space-y-4">
          {summary ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["광고비", `${summary.adSpend.toLocaleString()}원`],
                ["노출", summary.impressions.toLocaleString()],
                ["클릭", summary.clicks.toLocaleString()],
                ["주문", summary.orders.toLocaleString()],
                ["ROAS", `${summary.roas.toFixed(1)}%`],
              ].map(([label, value]) => (
                <Panel key={label} className="!p-3">
                  <p className="text-xs text-muted">{label}</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-ink">{value}</p>
                </Panel>
              ))}
            </div>
          ) : null}

          <Panel title="광고비 입력">
            <form onSubmit={addCost} className="grid gap-2 sm:grid-cols-3">
              <TextSelect
                value={costForm.storeId}
                onChange={(e) => setCostForm({ ...costForm, storeId: e.target.value })}
                required
              >
                <option value="">자사 점포</option>
                {ownStores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.platform?.name})
                  </option>
                ))}
              </TextSelect>
              <TextInput
                type="date"
                value={costForm.costDate}
                onChange={(e) => setCostForm({ ...costForm, costDate: e.target.value })}
              />
              <TextInput
                placeholder="광고비"
                value={costForm.adSpend}
                onChange={(e) => setCostForm({ ...costForm, adSpend: e.target.value })}
              />
              <TextInput
                placeholder="노출"
                value={costForm.impressions}
                onChange={(e) => setCostForm({ ...costForm, impressions: e.target.value })}
              />
              <TextInput
                placeholder="클릭"
                value={costForm.clicks}
                onChange={(e) => setCostForm({ ...costForm, clicks: e.target.value })}
              />
              <TextInput
                placeholder="주문"
                value={costForm.orders}
                onChange={(e) => setCostForm({ ...costForm, orders: e.target.value })}
              />
              <TextInput
                placeholder="주문금액"
                value={costForm.orderAmount}
                onChange={(e) => setCostForm({ ...costForm, orderAmount: e.target.value })}
              />
              <TextInput
                placeholder="메모(5자)"
                maxLength={5}
                value={costForm.memo}
                onChange={(e) => setCostForm({ ...costForm, memo: e.target.value })}
              />
              <TextInput
                placeholder="시간(10자)"
                maxLength={10}
                value={costForm.checkTime}
                onChange={(e) => setCostForm({ ...costForm, checkTime: e.target.value })}
              />
              <div className="sm:col-span-3 rounded-btn border border-line bg-paper/50 px-3 py-2 text-sm text-muted">
                미리보기 CTR {preview.ctr}% · CVR {preview.cvr}% · CPC {preview.cpc.toLocaleString()} · CPA{" "}
                {preview.cpa.toLocaleString()} · ROAS{" "}
                <span className={preview.roas >= 100 ? "text-ink font-medium" : "text-danger font-medium"}>
                  {preview.roas}%
                </span>
              </div>
              <Button type="submit" className="sm:col-span-2">
                저장
              </Button>
            </form>
          </Panel>

          <TableShell>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-paper text-left text-muted">
                  <tr>
                    <th className="px-3 py-2">날짜</th>
                    <th className="px-3 py-2">점포</th>
                    <th className="px-3 py-2">광고비</th>
                    <th className="px-3 py-2">노출</th>
                    <th className="px-3 py-2">클릭</th>
                    <th className="px-3 py-2">주문</th>
                    <th className="px-3 py-2">ROAS</th>
                    <th className="px-3 py-2">메모</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {costs.map((c) => (
                    <tr key={c.id} className="border-t border-line">
                      <td className="px-3 py-2 font-mono">{String(c.costDate).slice(0, 10)}</td>
                      <td className="px-3 py-2">
                        {c.store?.name} · {c.platform?.name}
                      </td>
                      <td className="px-3 py-2 font-mono">{c.adSpend.toLocaleString()}</td>
                      <td className="px-3 py-2 font-mono">{c.impressions.toLocaleString()}</td>
                      <td className="px-3 py-2 font-mono">{c.clicks.toLocaleString()}</td>
                      <td className="px-3 py-2 font-mono">{c.orders.toLocaleString()}</td>
                      <td className="px-3 py-2 font-mono">
                        <span className={Number(c.roas) >= 100 ? "text-ink" : "text-danger"}>
                          {Number(c.roas).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted">
                        {c.memo || "-"}
                        {c.checkTime ? ` · ${c.checkTime}` : ""}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button type="button" variant="danger" size="sm" onClick={() => remove("cost", c.id)}>
                          삭제
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableShell>
        </div>
      ) : null}

      {tab === "reviews" ? (
        <div className="space-y-4">
          <Panel title="리뷰수 일괄 입력" description="누적 총 리뷰수를 날짜 기준으로 저장합니다.">
            <form onSubmit={saveReviews} className="space-y-3">
              <Field label="날짜">
                <TextInput type="date" className="w-auto" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
              </Field>
              <div className="grid gap-2 sm:grid-cols-2">
                {stores.map((store) => (
                  <label key={store.id} className="flex items-center gap-2 rounded-btn border border-line bg-card px-3 py-2 text-sm">
                    <span className="min-w-28">
                      {store.name}
                      <span className="ml-1 text-xs text-muted">{store.storeType === "OWN" ? "자사" : "경쟁"}</span>
                    </span>
                    <TextInput
                      type="number"
                      className="flex-1"
                      placeholder="리뷰수"
                      value={reviewRows[store.id] ?? ""}
                      onChange={(e) => setReviewRows({ ...reviewRows, [store.id]: e.target.value })}
                    />
                  </label>
                ))}
              </div>
              <Button type="submit">일괄 저장</Button>
            </form>
          </Panel>

          <TableShell>
            <table className="w-full text-sm">
              <thead className="bg-paper text-left text-muted">
                <tr>
                  <th className="px-3 py-2">날짜</th>
                  <th className="px-3 py-2">점포</th>
                  <th className="px-3 py-2">리뷰수</th>
                  <th className="px-3 py-2">증감</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r, idx) => {
                  const sameStorePrev = [...reviews]
                    .slice(0, idx)
                    .reverse()
                    .find((x) => x.storeId === r.storeId);
                  const base = sameStorePrev?.reviewCount ?? prevByStore[String(r.storeId)];
                  const delta = base == null ? null : r.reviewCount - base;
                  return (
                    <tr key={r.id} className="border-t border-line">
                      <td className="px-3 py-2 font-mono">{String(r.reviewDate).slice(0, 10)}</td>
                      <td className="px-3 py-2">{r.store?.name}</td>
                      <td className="px-3 py-2 font-mono">{r.reviewCount}</td>
                      <td className="px-3 py-2 font-mono">
                        {delta == null ? (
                          "-"
                        ) : (
                          <span className={delta >= 0 ? "text-ink" : "text-danger"}>
                            {delta >= 0 ? `+${delta}` : delta}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button type="button" variant="danger" size="sm" onClick={() => remove("review", r.id)}>
                          삭제
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableShell>
        </div>
      ) : null}

      {tab === "exposure" ? (
        <div className="space-y-4">
          <Panel title="노출순위 입력">
            <form onSubmit={addExposure} className="grid gap-2 sm:grid-cols-4">
              <TextInput
                placeholder="지역명"
                value={exposureForm.regionName}
                onChange={(e) => setExposureForm({ ...exposureForm, regionName: e.target.value })}
                required
              />
              <TextInput
                type="date"
                value={exposureForm.exposureDate}
                onChange={(e) => setExposureForm({ ...exposureForm, exposureDate: e.target.value })}
              />
              <TextInput
                placeholder="순위 (0=미노출)"
                value={exposureForm.rank}
                onChange={(e) => setExposureForm({ ...exposureForm, rank: e.target.value })}
              />
              <TextInput
                placeholder="키워드"
                value={exposureForm.keyword}
                onChange={(e) => setExposureForm({ ...exposureForm, keyword: e.target.value })}
              />
              <Button type="submit">저장</Button>
            </form>
          </Panel>
          <TableShell>
            <table className="w-full text-sm">
              <thead className="bg-paper text-left text-muted">
                <tr>
                  <th className="px-3 py-2">날짜</th>
                  <th className="px-3 py-2">지역</th>
                  <th className="px-3 py-2">키워드</th>
                  <th className="px-3 py-2">순위</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {exposures.map((x) => {
                  const rank = x.rank;
                  const tone =
                    rank == null || rank === 0 ? "muted" : rank <= 3 ? "ink" : rank <= 10 ? "gold" : "danger";
                  return (
                    <tr key={x.id} className="border-t border-line">
                      <td className="px-3 py-2 font-mono">{String(x.exposureDate).slice(0, 10)}</td>
                      <td className="px-3 py-2">{x.regionName}</td>
                      <td className="px-3 py-2">{x.keyword || "-"}</td>
                      <td className="px-3 py-2">
                        <Badge tone={tone}>{rank == null || rank === 0 ? "안보임" : rank}</Badge>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button type="button" variant="danger" size="sm" onClick={() => remove("exposure", x.id)}>
                          삭제
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableShell>
        </div>
      ) : null}

      {tab === "stats" && stats ? (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["월 광고비", `${stats.summary.adSpend.toLocaleString()}원`],
              ["월 주문금액", `${stats.summary.orderAmount.toLocaleString()}원`],
              ["평균 CTR", `${stats.summary.ctr}%`],
              ["월 ROAS", `${stats.summary.roas}%`],
            ].map(([label, value]) => (
              <Panel key={label} className="!p-3">
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
              </Panel>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="플랫폼별 광고비 / ROAS">
              <div className="space-y-2 text-sm">
                {stats.platformStats.map((row) => (
                  <div key={row.name} className="flex items-center justify-between rounded-btn bg-paper px-3 py-2">
                    <span>{row.name}</span>
                    <span className="font-mono">
                      {row.spend.toLocaleString()}원 · ROAS {row.roas}%
                    </span>
                  </div>
                ))}
                {!stats.platformStats.length ? <p className="text-muted">데이터 없음</p> : null}
              </div>
            </Panel>
            <Panel title="점포별 리뷰 성장">
              <div className="space-y-2 text-sm">
                {stats.reviewGrowth.map((row) => (
                  <div key={`${row.storeName}-${row.platformName}`} className="flex justify-between rounded-btn bg-paper px-3 py-2">
                    <span>
                      {row.storeName} · {row.platformName}
                    </span>
                    <span className={`font-mono ${row.growth >= 0 ? "text-ink" : "text-danger"}`}>
                      {row.start} → {row.end} ({row.growth >= 0 ? `+${row.growth}` : row.growth})
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
          <Panel title="일별 광고비 추이">
            <div className="space-y-1 text-sm">
              {stats.dailyTrend.map((row) => (
                <div key={row.date} className="flex justify-between border-b border-line py-1 font-mono">
                  <span>{row.date.slice(0, 10)}</span>
                  <span>{row.spend.toLocaleString()}원</span>
                </div>
              ))}
              {!stats.dailyTrend.length ? <p className="text-muted">데이터 없음</p> : null}
            </div>
          </Panel>
        </div>
      ) : null}

      {tab === "stores" ? (
        <div className="space-y-4">
          <Panel title="점포 추가">
            <form onSubmit={addStore} className="flex flex-wrap gap-2">
              <TextInput
                className="w-auto"
                placeholder="점포명"
                value={storeForm.name}
                onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                required
              />
              <TextSelect
                className="w-auto"
                value={storeForm.platformId}
                onChange={(e) => setStoreForm({ ...storeForm, platformId: e.target.value })}
              >
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </TextSelect>
              <TextSelect
                className="w-auto"
                value={storeForm.storeType}
                onChange={(e) => setStoreForm({ ...storeForm, storeType: e.target.value })}
              >
                <option value="OWN">자사</option>
                <option value="COMPETITOR">경쟁사</option>
              </TextSelect>
              <Button type="submit">추가</Button>
            </form>
          </Panel>
          <TableShell>
            <table className="w-full text-sm">
              <thead className="bg-paper text-left text-muted">
                <tr>
                  <th className="px-3 py-2">점포</th>
                  <th className="px-3 py-2">플랫폼</th>
                  <th className="px-3 py-2">유형</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {stores.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="px-3 py-2">{s.name}</td>
                    <td className="px-3 py-2">{s.platform?.name}</td>
                    <td className="px-3 py-2">
                      <Badge tone={s.storeType === "OWN" ? "ink" : "muted"}>
                        {s.storeType === "OWN" ? "자사" : "경쟁사"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button type="button" variant="danger" size="sm" onClick={() => remove("store", s.id)}>
                        삭제
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </div>
      ) : null}
    </div>
  );
}
