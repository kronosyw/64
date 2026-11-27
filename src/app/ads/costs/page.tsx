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
} from "@/components/ui";
import { calcAdMetrics } from "@/lib/ads";
import { filterAdsBranches } from "@/lib/ad-stores";
import {
  AdsBranch,
  AdsPlatform,
  AdsStore,
  dateKey,
  formatNum,
  shiftYearMonth,
  weekendRowClass,
} from "@/lib/ads-ui";

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
  notes?: string | null;
  store?: AdsStore;
  platform?: AdsPlatform;
  storeId: number;
  platformId: number;
};

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

const emptyForm = {
  id: "",
  storeId: "",
  costDate: "",
  adSpend: "",
  impressions: "",
  clicks: "",
  orders: "",
  orderAmount: "",
  notes: "",
};

export default function AdsCostsPage() {
  const now = new Date();
  const [branches, setBranches] = useState<AdsBranch[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [platforms, setPlatforms] = useState<AdsPlatform[]>([]);
  const [stores, setStores] = useState<AdsStore[]>([]);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const preview = useMemo(
    () =>
      calcAdMetrics({
        adSpend: Number(form.adSpend || 0),
        impressions: Number(form.impressions || 0),
        clicks: Number(form.clicks || 0),
        orders: Number(form.orders || 0),
        orderAmount: Number(form.orderAmount || 0),
      }),
    [form],
  );

  async function loadMeta() {
    const [bRes, pRes] = await Promise.all([fetch("/api/branches"), fetch("/api/ads?type=platforms")]);
    const bData = await bRes.json();
    const pData = await pRes.json();
    if (bData.success && bData.branches?.length) {
      const list = filterAdsBranches(bData.branches as AdsBranch[]);
      setBranches(list);
      setBranchId((prev) => (prev != null && list.some((b) => b.id === prev) ? prev : list[0]?.id ?? null));
    }
    if (pData.success) setPlatforms(pData.platforms || []);
  }

  async function loadCosts(id: number, y: number, m: number) {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        type: "costs",
        branchId: String(id),
        year: String(y),
        month: String(m),
      });
      if (platformFilter !== "all") q.set("platformId", platformFilter);
      if (storeFilter !== "all") q.set("storeId", storeFilter);
      const [costRes, storeRes] = await Promise.all([
        fetch(`/api/ads?${q}`).then((r) => r.json()),
        fetch(`/api/ads?type=stores&storeType=OWN&branchId=${id}`).then((r) => r.json()),
      ]);
      if (costRes.success) {
        setCosts(costRes.costs || []);
        setSummary(costRes.summary || null);
      } else setMessage(costRes.message || "불러오기 실패");
      if (storeRes.success) setStores(storeRes.stores || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMeta();
    setForm((f) => ({ ...f, costDate: now.toISOString().slice(0, 10) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (branchId) loadCosts(branchId, year, month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, year, month, platformFilter, storeFilter]);

  function openCreate() {
    setForm({
      ...emptyForm,
      costDate: `${year}-${String(month).padStart(2, "0")}-01`,
      storeId: stores[0] ? String(stores[0].id) : "",
    });
    setShowForm(true);
  }

  function openEdit(cost: Cost) {
    setForm({
      id: String(cost.id),
      storeId: String(cost.storeId),
      costDate: dateKey(cost.costDate),
      adSpend: String(cost.adSpend),
      impressions: String(cost.impressions),
      clicks: String(cost.clicks),
      orders: String(cost.orders),
      orderAmount: String(cost.orderAmount),
      notes: cost.notes || "",
    });
    setShowForm(true);
  }

  async function saveCost(e: FormEvent) {
    e.preventDefault();
    if (!branchId) return;
    const store = stores.find((s) => s.id === Number(form.storeId));
    if (!store) {
      setMessage("자사 점포를 선택하세요.");
      return;
    }
    const res = await fetch("/api/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cost",
        id: form.id ? Number(form.id) : undefined,
        branchId,
        storeId: Number(form.storeId),
        platformId: store.platformId,
        costDate: form.costDate,
        adSpend: Number(form.adSpend || 0),
        impressions: Number(form.impressions || 0),
        clicks: Number(form.clicks || 0),
        orders: Number(form.orders || 0),
        orderAmount: Number(form.orderAmount || 0),
        notes: form.notes || null,
      }),
    });
    const data = await res.json();
    setMessage(data.success ? "저장했습니다." : data.message || "실패");
    if (data.success) {
      setShowForm(false);
      loadCosts(branchId, year, month);
    }
  }

  async function deleteCost(id: number) {
    if (!confirm("삭제할까요?")) return;
    const res = await fetch(`/api/ads?type=cost&id=${id}`, { method: "DELETE" });
    const data = await res.json();
    setMessage(data.success ? "삭제했습니다." : data.message || "실패");
    if (data.success && branchId) loadCosts(branchId, year, month);
  }

  const footerMetrics: Summary = useMemo(() => {
    if (summary) return summary;
    const m = calcAdMetrics({
      adSpend: 0,
      impressions: 0,
      clicks: 0,
      orders: 0,
      orderAmount: 0,
    });
    return {
      adSpend: 0,
      impressions: 0,
      clicks: 0,
      orders: 0,
      orderAmount: 0,
      ...m,
    };
  }, [summary]);

  return (
    <div className="space-y-4">
      <section className="desk-panel overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-flex h-9 w-9 items-center justify-center rounded-btn bg-ink/10 text-base font-bold text-ink"
            >
              ₩
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink">광고비관리</h1>
              <p className="mt-0.5 text-sm text-muted">자사 점포 일별 광고비·성과와 효율 지표를 관리합니다.</p>
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
            <Button type="button" variant="gold" size="lg" onClick={openCreate}>
              광고비 입력
            </Button>
          </div>
        </div>

        <div className="border-b border-line bg-paper/55 px-4 py-3">
          <AdsSubnav />
        </div>

        <div className="flex flex-wrap items-end gap-4 px-4 py-3">
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
            label="점포 (자사)"
            value={storeFilter}
            onChange={setStoreFilter}
            options={[
              { id: "all", label: "전체" },
              ...stores.map((s) => ({
                id: String(s.id),
                label: s.platform?.name ? `${s.name}` : s.name,
              })),
            ]}
          />
        </div>
      </section>

      {message ? <Message tone="ok">{message}</Message> : null}
      {loading ? <p className="text-sm text-muted">불러오는 중…</p> : null}

      <AdsStatCards
        columns={5}
        items={[
          { label: "광고지출", value: formatNum(summary?.adSpend || 0) },
          { label: "노출", value: formatNum(summary?.impressions || 0) },
          { label: "클릭", value: formatNum(summary?.clicks || 0) },
          { label: "주문", value: formatNum(summary?.orders || 0) },
          { label: "주문금액", value: formatNum(summary?.orderAmount || 0) },
        ]}
      />
      <AdsStatCards
        columns={5}
        items={[
          { label: "CTR %", value: Number(summary?.ctr || 0).toLocaleString("ko-KR"), hint: "클릭율" },
          { label: "CVR %", value: Number(summary?.cvr || 0).toLocaleString("ko-KR"), hint: "전환율" },
          { label: "CPC", value: formatNum(summary?.cpc || 0), hint: "클릭당비용" },
          { label: "CPA", value: formatNum(summary?.cpa || 0), hint: "주문당비용" },
          { label: "ROAS %", value: Number(summary?.roas || 0).toLocaleString("ko-KR"), hint: "광고수익률" },
        ]}
      />

      <section className="desk-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="font-semibold text-ink">일별 광고비</h2>
          <p className="text-[11px] text-muted">
            CTR: 클릭율 | CVR: 전환율 | CPC: 클릭당비용 | CPA: 주문당비용 | ROAS: 광고수익률
          </p>
        </div>

        {!loading && costs.length === 0 ? (
          <div className="p-4">
            <EmptyState>
              <p className="mb-3">데이터가 없습니다.</p>
              <Button type="button" onClick={openCreate}>
                첫 데이터 입력
              </Button>
            </EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-left text-xs text-muted">
                  {[
                    "날짜",
                    "점포",
                    "플랫폼",
                    "광고지출",
                    "노출수",
                    "클릭수",
                    "주문수",
                    "주문금액",
                    "CTR",
                    "CVR",
                    "CPC",
                    "ROAS",
                    "관리",
                  ].map((h) => (
                    <th
                      key={h}
                      className={`px-2.5 py-2.5 font-medium ${
                        ["광고지출", "노출수", "클릭수", "주문수", "주문금액", "CTR", "CVR", "CPC", "ROAS"].includes(h)
                          ? "text-right"
                          : ""
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {costs.map((c) => (
                  <tr
                    key={c.id}
                    className={`border-b border-line/70 ${weekendRowClass(c.costDate)}`}
                  >
                    <td className="px-2.5 py-1.5 whitespace-nowrap">{dateKey(c.costDate)}</td>
                    <td className="px-2.5 py-1.5">{c.store?.name}</td>
                    <td className="px-2.5 py-1.5">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: c.platform?.colorCode || "#94a3b8" }}
                        />
                        {c.platform?.name}
                      </span>
                    </td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums">{formatNum(c.adSpend)}</td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums">{formatNum(c.impressions)}</td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums">{formatNum(c.clicks)}</td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums">{formatNum(c.orders)}</td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums">{formatNum(c.orderAmount)}</td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums">{Number(c.ctr)}</td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums">{Number(c.cvr)}</td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums">{formatNum(c.cpc)}</td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums">{Number(c.roas)}</td>
                    <td className="px-2.5 py-1.5 whitespace-nowrap">
                      <Button type="button" size="sm" variant="link" onClick={() => openEdit(c)}>
                        수정
                      </Button>
                      <Button type="button" size="sm" variant="link" className="text-danger" onClick={() => deleteCost(c.id)}>
                        삭제
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {costs.length ? (
                <tfoot>
                  <tr className="border-t-2 border-ink/15 bg-paper/80 text-sm font-semibold">
                    <td className="px-2.5 py-2.5" colSpan={3}>
                      합계
                    </td>
                    <td className="px-2.5 py-2.5 text-right tabular-nums">{formatNum(footerMetrics.adSpend)}</td>
                    <td className="px-2.5 py-2.5 text-right tabular-nums">{formatNum(footerMetrics.impressions)}</td>
                    <td className="px-2.5 py-2.5 text-right tabular-nums">{formatNum(footerMetrics.clicks)}</td>
                    <td className="px-2.5 py-2.5 text-right tabular-nums">{formatNum(footerMetrics.orders)}</td>
                    <td className="px-2.5 py-2.5 text-right tabular-nums">{formatNum(footerMetrics.orderAmount)}</td>
                    <td className="px-2.5 py-2.5 text-right tabular-nums">{footerMetrics.ctr}</td>
                    <td className="px-2.5 py-2.5 text-right tabular-nums">{footerMetrics.cvr}</td>
                    <td className="px-2.5 py-2.5 text-right tabular-nums">{formatNum(footerMetrics.cpc)}</td>
                    <td className="px-2.5 py-2.5 text-right tabular-nums">{footerMetrics.roas}</td>
                    <td className="px-2.5 py-2.5" />
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        )}
      </section>

      {showForm ? (
        <Modal
          title={form.id ? "광고비 수정" : "광고비 입력"}
          onClose={() => setShowForm(false)}
          footer={
            <>
              <Button type="submit" form="ads-cost-form" className="flex-1" size="lg">
                저장
              </Button>
              <Button type="button" variant="ghost" size="lg" onClick={() => setShowForm(false)}>
                취소
              </Button>
            </>
          }
        >
          <form id="ads-cost-form" onSubmit={saveCost} className="space-y-3">
            {!form.id ? (
              <>
                <AdsChipGroup
                  label="점포(자사)"
                  value={form.storeId || "none"}
                  onChange={(id) => {
                    if (id === "none") return;
                    setForm({ ...form, storeId: id });
                  }}
                  options={
                    stores.length
                      ? stores.map((s) => ({
                          id: String(s.id),
                          label: `${s.name}${s.platform?.name ? ` · ${s.platform.name}` : ""}`,
                        }))
                      : [{ id: "none", label: "자사 점포 없음" }]
                  }
                />
                <Field label="날짜">
                  <TextInput
                    type="date"
                    value={form.costDate}
                    onChange={(e) => setForm({ ...form, costDate: e.target.value })}
                    required
                  />
                </Field>
              </>
            ) : (
              <p className="rounded-btn border border-line bg-paper/60 px-3 py-2 text-sm text-muted">
                {form.costDate} · 점포/날짜/플랫폼은 잠금 · 수치·메모만 수정
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["adSpend", "광고비"],
                  ["impressions", "노출"],
                  ["clicks", "클릭"],
                  ["orders", "주문"],
                  ["orderAmount", "주문금액"],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <TextInput
                    type="number"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </Field>
              ))}
            </div>
            <Field label="메모">
              <TextInput value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <div className="grid grid-cols-5 gap-1.5 rounded-btn border border-line bg-paper/70 p-2 text-center text-[11px]">
              <div>
                <div className="text-muted">CTR</div>
                <div className="font-semibold tabular-nums text-ink">{preview.ctr}</div>
              </div>
              <div>
                <div className="text-muted">CVR</div>
                <div className="font-semibold tabular-nums text-ink">{preview.cvr}</div>
              </div>
              <div>
                <div className="text-muted">CPC</div>
                <div className="font-semibold tabular-nums text-ink">{preview.cpc}</div>
              </div>
              <div>
                <div className="text-muted">CPA</div>
                <div className="font-semibold tabular-nums text-ink">{preview.cpa}</div>
              </div>
              <div>
                <div className="text-muted">ROAS</div>
                <div className="font-semibold tabular-nums text-ink">{preview.roas}</div>
              </div>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
