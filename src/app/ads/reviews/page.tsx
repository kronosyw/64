"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdsChipGroup } from "@/components/ads/AdsChipGroup";
import { AdsStatCards } from "@/components/ads/AdsStatCards";
import { AdsSubnav } from "@/components/ads/AdsSubnav";
import { BranchSwitcher } from "@/components/ads/BranchSwitcher";
import { MonthNav } from "@/components/ads/MonthNav";
import {
  Button,
  EmptyState,
  Field,
  Message,
  Modal,
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
  weekendDayClass,
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showStore, setShowStore] = useState(false);
  const [showPlatform, setShowPlatform] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [storeForm, setStoreForm] = useState({ name: "", platformId: "", storeType: "OWN" });
  const [platformForm, setPlatformForm] = useState({ name: "", code: "", colorCode: "#3B82F6" });
  const [bulkDate, setBulkDate] = useState(now.toISOString().slice(0, 10));
  const [bulkRows, setBulkRows] = useState<Record<number, string>>({});

  const monthDays = daysInMonth(year, month);

  const dayList = useMemo(() => {
    const all = Array.from({ length: monthDays }, (_, i) => i + 1);
    if (!startDate && !endDate) return all;
    return all.filter((d) => {
      const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (startDate && key < startDate) return false;
      if (endDate && key > endDate) return false;
      return true;
    });
  }, [monthDays, year, month, startDate, endDate]);

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
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
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
    return stores
      .filter((s) => {
        if (platformFilter !== "all" && String(s.platformId) !== platformFilter) return false;
        if (typeFilter !== "all" && s.storeType !== typeFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.storeType !== b.storeType) return a.storeType === "OWN" ? -1 : 1;
        return a.name.localeCompare(b.name, "ko");
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
      for (const d of dayList) {
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
  }, [stores, reviewMap, dayList, year, month]);

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

  function resetFilters() {
    setPlatformFilter("all");
    setTypeFilter("all");
    setStartDate("");
    setEndDate("");
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

  const bulkStores = useMemo(() => {
    return filteredStores.length ? filteredStores : stores;
  }, [filteredStores, stores]);

  return (
    <div className="space-y-4">
      <section className="desk-panel overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-flex h-9 w-9 items-center justify-center rounded-btn bg-gold/25 text-lg text-ink"
              >
                ★
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-ink">리뷰분석</h1>
                <p className="mt-0.5 text-sm text-muted">자사·경쟁사 일별 리뷰수와 증감을 비교합니다.</p>
              </div>
            </div>
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

        <div className="border-b border-line bg-paper/55 px-4 py-3">
          <AdsSubnav />
        </div>

        <div className="flex flex-wrap items-end gap-4 border-b border-line bg-paper/35 px-4 py-3">
          <AdsChipGroup
            label="플랫폼"
            value={platformFilter}
            onChange={setPlatformFilter}
            options={[
              { id: "all", label: "전체" },
              ...platforms.map((p) => ({ id: String(p.id), label: p.name })),
            ]}
          />
          <AdsChipGroup
            label="점포유형"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { id: "all", label: "전체" },
              { id: "OWN", label: "자사" },
              { id: "COMPETITOR", label: "경쟁사" },
            ]}
          />
          <div className="flex flex-wrap items-end gap-2">
            <Field label="기간(선택)">
              <div className="flex items-center gap-1.5">
                <TextInput
                  type="date"
                  className="w-auto min-w-[9.5rem]"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="text-muted">~</span>
                <TextInput
                  type="date"
                  className="w-auto min-w-[9.5rem]"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </Field>
            <Button type="button" variant="soft" size="sm" className="mb-0.5" onClick={resetFilters}>
              초기화
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Button type="button" variant="gold" size="lg" onClick={() => setShowBulk(true)}>
            리뷰수 입력
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowStore(true)}>
              점포추가
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowPlatform(true)}>
              플랫폼추가
            </Button>
          </div>
        </div>
      </section>

      {message ? <Message tone="ok">{message}</Message> : null}
      {loading ? <p className="text-sm text-muted">불러오는 중…</p> : null}

      <AdsStatCards
        items={[
          { label: "등록 점포", value: formatNum(summary.storeCount) },
          { label: "자사 점포", value: formatNum(summary.ownCount) },
          { label: "자사 월 리뷰 증가", value: formatNum(summary.ownGrowth) },
          { label: "자사 평균 증가", value: formatNum(summary.ownAvg) },
        ]}
      />

      {!loading && stores.length === 0 ? (
        <EmptyState>
          <p className="mb-3">등록된 점포가 없습니다.</p>
          <Button type="button" onClick={() => setShowStore(true)}>
            첫 점포 추가
          </Button>
        </EmptyState>
      ) : null}

      {[...byPlatform.entries()].map(([platformId, list]) => {
        const platform = platforms.find((p) => p.id === platformId) || list[0]?.platform;
        const accent = platform?.colorCode || "#1a56db";
        return (
          <section key={platformId} className="desk-panel overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
              <h2 className="font-semibold text-ink">{platform?.name || `플랫폼 ${platformId}`}</h2>
              <span className="text-xs text-muted">{list.length}개 점포</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="sticky left-0 z-10 bg-card px-3 py-2.5 text-left font-medium shadow-[2px_0_0_rgba(12,35,64,0.06)]">
                      점포
                    </th>
                    {dayList.map((d) => {
                      const wd = weekdayOf(year, month, d);
                      return (
                        <th
                          key={d}
                          className={`min-w-[2.1rem] px-1 py-2 text-center font-medium ${weekendDayClass(wd)}`}
                        >
                          {d}
                        </th>
                      );
                    })}
                    <th className="px-2 py-2 font-medium">증감</th>
                    <th className="px-2 py-2 font-medium">평균</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((store) => {
                    const counts: number[] = [];
                    const cells = dayList.map((d) => {
                      const { count, delta } = cell(store.id, d);
                      if (count != null) counts.push(count);
                      return { d, count, delta };
                    });
                    const monthDelta = counts.length ? Math.max(...counts) - Math.min(...counts) : 0;
                    const avg = counts.length
                      ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length)
                      : 0;
                    const rowBg = store.storeType === "OWN" ? "bg-sky-50/55" : "bg-card";
                    return (
                      <tr key={store.id} className={`border-b border-line/70 ${rowBg}`}>
                        <td
                          className={`sticky left-0 z-10 px-3 py-1.5 font-medium whitespace-nowrap shadow-[2px_0_0_rgba(12,35,64,0.06)] ${rowBg}`}
                        >
                          {store.name}
                          <span
                            className={`ml-1.5 inline-flex rounded-full px-1.5 py-0.5 text-[10px] ${
                              store.storeType === "OWN"
                                ? "bg-ink/10 text-ink"
                                : "bg-line/80 text-muted"
                            }`}
                          >
                            {store.storeType === "OWN" ? "자사" : "경쟁"}
                          </span>
                        </td>
                        {cells.map(({ d, count, delta }) => {
                          const wd = weekdayOf(year, month, d);
                          return (
                            <td
                              key={d}
                              className={`px-1 py-1 text-center tabular-nums ${weekendDayClass(wd)}`}
                            >
                              {count != null ? formatNum(count) : (
                                <span className="text-muted/70">-</span>
                              )}
                              {delta != null && delta !== 0 ? (
                                <div
                                  className={`text-[10px] font-medium ${
                                    delta > 0 ? "text-emerald-600" : "text-red-600"
                                  }`}
                                >
                                  {delta > 0 ? `+${delta}` : delta}
                                </div>
                              ) : null}
                            </td>
                          );
                        })}
                        <td className="px-2 py-1 text-center font-semibold tabular-nums text-ink">
                          {formatNum(monthDelta)}
                        </td>
                        <td className="px-2 py-1 text-center tabular-nums">{formatNum(avg)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {showStore ? (
        <Modal
          title="점포 추가"
          onClose={() => setShowStore(false)}
          footer={
            <>
              <Button type="submit" form="ads-store-form" className="flex-1" size="lg">
                저장
              </Button>
              <Button type="button" variant="ghost" size="lg" onClick={() => setShowStore(false)}>
                취소
              </Button>
            </>
          }
        >
          <form id="ads-store-form" onSubmit={saveStore} className="space-y-3">
            <Field label="점포명">
              <TextInput
                value={storeForm.name}
                onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                required
              />
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
            <AdsChipGroup
              label="유형"
              value={storeForm.storeType}
              onChange={(id) => setStoreForm({ ...storeForm, storeType: id })}
              options={[
                { id: "OWN", label: "자사" },
                { id: "COMPETITOR", label: "경쟁사" },
              ]}
            />
          </form>
        </Modal>
      ) : null}

      {showPlatform ? (
        <Modal
          title="플랫폼 추가"
          onClose={() => setShowPlatform(false)}
          footer={
            <>
              <Button type="submit" form="ads-platform-form" className="flex-1" size="lg">
                저장
              </Button>
              <Button type="button" variant="ghost" size="lg" onClick={() => setShowPlatform(false)}>
                취소
              </Button>
            </>
          }
        >
          <form id="ads-platform-form" onSubmit={savePlatform} className="space-y-3">
            <Field label="이름">
              <TextInput
                value={platformForm.name}
                onChange={(e) => setPlatformForm({ ...platformForm, name: e.target.value })}
                required
              />
            </Field>
            <Field label="코드 (영문)">
              <TextInput
                value={platformForm.code}
                onChange={(e) => setPlatformForm({ ...platformForm, code: e.target.value })}
                required
              />
            </Field>
            <Field label="색상">
              <TextInput
                type="color"
                value={platformForm.colorCode}
                onChange={(e) => setPlatformForm({ ...platformForm, colorCode: e.target.value })}
              />
            </Field>
          </form>
        </Modal>
      ) : null}

      {showBulk ? (
        <Modal
          title="리뷰수 입력"
          onClose={() => setShowBulk(false)}
          footer={
            <>
              <Button type="submit" form="ads-bulk-form" className="flex-1" size="lg">
                저장
              </Button>
              <Button type="button" variant="ghost" size="lg" onClick={() => setShowBulk(false)}>
                취소
              </Button>
            </>
          }
        >
          <form id="ads-bulk-form" onSubmit={saveBulk} className="space-y-3">
            <Field label="날짜">
              <TextInput
                type="date"
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
                required
              />
            </Field>
            <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              {bulkStores.map((s) => (
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
            <p className="text-xs text-muted">빈 칸은 저장하지 않습니다.</p>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
