"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdsSubnav } from "@/components/ads/AdsSubnav";
import { MonthNav } from "@/components/ads/MonthNav";
import {
  Button,
  Field,
  Message,
  PageHeader,
  Panel,
  TextInput,
  TextSelect,
} from "@/components/ui";
import {
  AdsBranch,
  AdsPlatform,
  AdsStore,
  dateKey,
  daysInMonth,
  formatNum,
  shiftYearMonth,
  weekdayOf,
} from "@/lib/ads-ui";

type Review = { id: number; storeId: number; reviewDate: string; reviewCount: number };

export default function AdsReviewsPage() {
  const now = new Date();
  const [branches, setBranches] = useState<AdsBranch[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [platforms, setPlatforms] = useState<AdsPlatform[]>([]);
  const [stores, setStores] = useState<AdsStore[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [prevByStore, setPrevByStore] = useState<Record<string, number>>({});
  const [platformFilter, setPlatformFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [showStore, setShowStore] = useState(false);
  const [showPlatform, setShowPlatform] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [storeForm, setStoreForm] = useState({ name: "", platformId: "", storeType: "OWN" });
  const [platformForm, setPlatformForm] = useState({ name: "", code: "", colorCode: "#3B82F6" });
  const [bulkDate, setBulkDate] = useState(now.toISOString().slice(0, 10));
  const [bulkRows, setBulkRows] = useState<Record<number, string>>({});

  const days = daysInMonth(year, month);

  async function loadMeta() {
    const [bRes, pRes] = await Promise.all([fetch("/api/branches"), fetch("/api/ads?type=platforms")]);
    const bData = await bRes.json();
    const pData = await pRes.json();
    if (bData.success && bData.branches?.length) {
      setBranches(bData.branches);
      setBranchId((prev) => prev ?? bData.branches[0].id);
    }
    if (pData.success) {
      setPlatforms(pData.platforms || []);
      if (pData.platforms?.[0]) {
        setStoreForm((f) => ({ ...f, platformId: f.platformId || String(pData.platforms[0].id) }));
      }
    }
  }

  async function loadReviews(id: number, y: number, m: number) {
    const res = await fetch(`/api/ads?type=reviews&branchId=${id}&year=${y}&month=${m}`);
    const data = await res.json();
    if (!data.success) {
      setMessage(data.message || "불러오기 실패");
      return;
    }
    setStores(data.stores || []);
    setReviews(data.reviews || []);
    setPrevByStore(data.prevByStore || {});
    const rows: Record<number, string> = {};
    for (const s of data.stores || []) rows[s.id] = "";
    setBulkRows(rows);
  }

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    if (branchId) loadReviews(branchId, year, month);
  }, [branchId, year, month]);

  const reviewMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of reviews) map.set(`${r.storeId}:${dateKey(r.reviewDate)}`, r.reviewCount);
    return map;
  }, [reviews]);

  const filteredStores = useMemo(() => {
    return stores.filter((s) => {
      if (platformFilter !== "all" && String(s.platformId) !== platformFilter) return false;
      if (typeFilter !== "all" && s.storeType !== typeFilter) return false;
      return true;
    });
  }, [stores, platformFilter, typeFilter]);

  const byPlatform = useMemo(() => {
    const groups = new Map<number, AdsStore[]>();
    for (const s of filteredStores) {
      const list = groups.get(s.platformId) || [];
      list.push(s);
      groups.set(s.platformId, list);
    }
    return groups;
  }, [filteredStores]);

  const summary = useMemo(() => {
    const own = stores.filter((s) => s.storeType === "OWN");
    let ownGrowth = 0;
    for (const s of own) {
      const counts: number[] = [];
      for (let d = 1; d <= days; d++) {
        const key = `${s.id}:${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        if (reviewMap.has(key)) counts.push(reviewMap.get(key)!);
      }
      if (counts.length) ownGrowth += Math.max(...counts) - Math.min(...counts);
    }
    return {
      storeCount: stores.length,
      ownCount: own.length,
      ownGrowth,
      ownAvg: own.length ? Math.round((ownGrowth / own.length) * 10) / 10 : 0,
    };
  }, [stores, reviewMap, days, year, month]);

  function cell(storeId: number, day: number) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const count = reviewMap.get(`${storeId}:${date}`);
    let prev = day === 1 ? prevByStore[String(storeId)] : undefined;
    if (day > 1) {
      const prevDate = `${year}-${String(month).padStart(2, "0")}-${String(day - 1).padStart(2, "0")}`;
      prev = reviewMap.get(`${storeId}:${prevDate}`);
    }
    const delta = count != null && prev != null ? count - prev : null;
    return { count, delta };
  }

  async function saveStore(e: FormEvent) {
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
    setMessage(data.success ? "점포를 저장했습니다." : data.message || "실패");
    if (data.success) {
      setShowStore(false);
      setStoreForm((f) => ({ ...f, name: "" }));
      loadReviews(branchId, year, month);
    }
  }

  async function savePlatform(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "platform", ...platformForm }),
    });
    const data = await res.json();
    setMessage(data.success ? "플랫폼을 저장했습니다." : data.message || "실패");
    if (data.success) {
      setShowPlatform(false);
      setPlatformForm({ name: "", code: "", colorCode: "#3B82F6" });
      loadMeta();
    }
  }

  async function saveBulk(e: FormEvent) {
    e.preventDefault();
    if (!branchId) return;
    const rows = Object.entries(bulkRows)
      .filter(([, v]) => v !== "")
      .map(([storeId, reviewCount]) => ({ storeId: Number(storeId), reviewCount }));
    const res = await fetch("/api/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bulk_reviews", branchId, reviewDate: bulkDate, rows }),
    });
    const data = await res.json();
    setMessage(data.success ? `${data.saved}건 저장` : data.message || "실패");
    if (data.success) {
      setShowBulk(false);
      loadReviews(branchId, year, month);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="리뷰분석"
        description="자사·경쟁사 일별 리뷰수와 증감을 비교합니다."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <TextSelect
              className="w-auto"
              value={branchId ?? ""}
              onChange={(e) => setBranchId(Number(e.target.value))}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </TextSelect>
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
        }
      />
      <AdsSubnav />
      {message ? <Message>{message}</Message> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["등록 점포", summary.storeCount],
          ["자사 점포", summary.ownCount],
          ["자사 월 리뷰 증가", summary.ownGrowth],
          ["자사 평균 증가", summary.ownAvg],
        ].map(([label, value]) => (
          <Panel key={String(label)}>
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-xl font-bold">{formatNum(Number(value))}</p>
          </Panel>
        ))}
      </div>

      <Panel
        title="필터 · 입력"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowPlatform(true)}>
              플랫폼
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowStore(true)}>
              점포
            </Button>
            <Button type="button" size="sm" onClick={() => setShowBulk(true)}>
              리뷰 일괄입력
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap gap-3">
          <Field label="플랫폼">
            <TextSelect value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
              <option value="all">전체</option>
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </TextSelect>
          </Field>
          <Field label="점포유형">
            <TextSelect value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">전체</option>
              <option value="OWN">자사</option>
              <option value="COMPETITOR">경쟁사</option>
            </TextSelect>
          </Field>
          <Button
            type="button"
            variant="soft"
            size="sm"
            className="self-end"
            onClick={() => {
              setPlatformFilter("all");
              setTypeFilter("all");
            }}
          >
            초기화
          </Button>
        </div>
      </Panel>

      {[...byPlatform.entries()].map(([platformId, list]) => {
        const platform = platforms.find((p) => p.id === platformId) || list[0]?.platform;
        return (
          <Panel key={platformId} title={platform?.name || `플랫폼 ${platformId}`}>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="sticky left-0 z-10 bg-card px-2 py-2 text-left">점포</th>
                    {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
                      const wd = weekdayOf(year, month, d);
                      return (
                        <th
                          key={d}
                          className={`px-1 py-2 text-center ${wd === 0 ? "bg-red-50" : wd === 6 ? "bg-amber-50" : ""}`}
                        >
                          {d}
                        </th>
                      );
                    })}
                    <th className="px-2 py-2">증감</th>
                    <th className="px-2 py-2">평균</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((store) => {
                    const counts: number[] = [];
                    let monthDelta = 0;
                    const cells = Array.from({ length: days }, (_, i) => i + 1).map((d) => {
                      const { count, delta } = cell(store.id, d);
                      if (count != null) counts.push(count);
                      return { d, count, delta };
                    });
                    if (counts.length) monthDelta = Math.max(...counts) - Math.min(...counts);
                    const avg = counts.length ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length) : 0;
                    return (
                      <tr
                        key={store.id}
                        className={`border-b border-line/70 ${store.storeType === "OWN" ? "bg-blue-50/40" : ""}`}
                      >
                        <td className="sticky left-0 z-10 bg-inherit px-2 py-1.5 font-medium whitespace-nowrap">
                          {store.name}
                          <span className="ml-1 text-[10px] text-muted">
                            {store.storeType === "OWN" ? "자사" : "경쟁"}
                          </span>
                        </td>
                        {cells.map(({ d, count, delta }) => {
                          const wd = weekdayOf(year, month, d);
                          return (
                            <td
                              key={d}
                              className={`px-1 py-1 text-center tabular-nums ${wd === 0 ? "bg-red-50/80" : wd === 6 ? "bg-amber-50/80" : ""}`}
                            >
                              {count != null ? formatNum(count) : "-"}
                              {delta != null && delta !== 0 ? (
                                <div className={`text-[10px] ${delta > 0 ? "text-emerald-600" : "text-red-600"}`}>
                                  {delta > 0 ? `+${delta}` : delta}
                                </div>
                              ) : null}
                            </td>
                          );
                        })}
                        <td className="px-2 py-1 text-center font-medium tabular-nums">{formatNum(monthDelta)}</td>
                        <td className="px-2 py-1 text-center tabular-nums">{formatNum(avg)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        );
      })}

      {showStore ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveStore} className="w-full max-w-md space-y-3 rounded-panel bg-card p-4 shadow-lg">
            <h3 className="font-semibold">점포 추가</h3>
            <Field label="점포명">
              <TextInput value={storeForm.name} onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })} required />
            </Field>
            <Field label="플랫폼">
              <TextSelect
                value={storeForm.platformId}
                onChange={(e) => setStoreForm({ ...storeForm, platformId: e.target.value })}
                required
              >
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="유형">
              <TextSelect
                value={storeForm.storeType}
                onChange={(e) => setStoreForm({ ...storeForm, storeType: e.target.value })}
              >
                <option value="OWN">자사</option>
                <option value="COMPETITOR">경쟁사</option>
              </TextSelect>
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowStore(false)}>
                취소
              </Button>
              <Button type="submit">저장</Button>
            </div>
          </form>
        </div>
      ) : null}

      {showPlatform ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={savePlatform} className="w-full max-w-md space-y-3 rounded-panel bg-card p-4 shadow-lg">
            <h3 className="font-semibold">플랫폼 추가</h3>
            <Field label="이름">
              <TextInput value={platformForm.name} onChange={(e) => setPlatformForm({ ...platformForm, name: e.target.value })} required />
            </Field>
            <Field label="코드">
              <TextInput value={platformForm.code} onChange={(e) => setPlatformForm({ ...platformForm, code: e.target.value })} required />
            </Field>
            <Field label="색상">
              <TextInput type="color" value={platformForm.colorCode} onChange={(e) => setPlatformForm({ ...platformForm, colorCode: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowPlatform(false)}>
                취소
              </Button>
              <Button type="submit">저장</Button>
            </div>
          </form>
        </div>
      ) : null}

      {showBulk ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveBulk} className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-panel bg-card p-4 shadow-lg">
            <h3 className="font-semibold">리뷰 일괄 입력</h3>
            <Field label="날짜">
              <TextInput type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} required />
            </Field>
            <div className="space-y-2">
              {stores.map((s) => (
                <Field key={s.id} label={`${s.name} (${s.platform?.name || s.platformId})`}>
                  <TextInput
                    type="number"
                    value={bulkRows[s.id] || ""}
                    onChange={(e) => setBulkRows({ ...bulkRows, [s.id]: e.target.value })}
                    placeholder="리뷰수"
                  />
                </Field>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowBulk(false)}>
                취소
              </Button>
              <Button type="submit">저장</Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
