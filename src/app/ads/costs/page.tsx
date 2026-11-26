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
  TableShell,
  TextInput,
  TextSelect,
} from "@/components/ui";
import { calcAdMetrics } from "@/lib/ads";
import {
  AdsBranch,
  AdsPlatform,
  AdsStore,
  dateKey,
  formatNum,
  shiftYearMonth,
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
  const [platformFilter, setPlatformFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
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
      setBranches(bData.branches);
      setBranchId((prev) => prev ?? bData.branches[0].id);
    }
    if (pData.success) setPlatforms(pData.platforms || []);
  }

  async function loadCosts(id: number, y: number, m: number) {
    const q = new URLSearchParams({
      type: "costs",
      branchId: String(id),
      year: String(y),
      month: String(m),
    });
    if (platformFilter) q.set("platformId", platformFilter);
    if (storeFilter) q.set("storeId", storeFilter);
    const [costRes, storeRes] = await Promise.all([
      fetch(`/api/ads?${q}`).then((r) => r.json()),
      fetch(`/api/ads?type=stores&storeType=OWN&branchId=${id}`).then((r) => r.json()),
    ]);
    if (costRes.success) {
      setCosts(costRes.costs || []);
      setSummary(costRes.summary || null);
    } else setMessage(costRes.message || "불러오기 실패");
    if (storeRes.success) setStores(storeRes.stores || []);
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

  return (
    <div className="space-y-4">
      <PageHeader
        title="광고비관리"
        description="자사 점포의 일별 광고비·성과와 효율 지표를 관리합니다."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <TextSelect className="w-auto" value={branchId ?? ""} onChange={(e) => setBranchId(Number(e.target.value))}>
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
            <Button type="button" onClick={openCreate}>
              입력
            </Button>
          </div>
        }
      />
      <AdsSubnav />
      {message ? <Message>{message}</Message> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["광고지출", summary?.adSpend],
          ["노출", summary?.impressions],
          ["클릭", summary?.clicks],
          ["주문", summary?.orders],
          ["주문금액", summary?.orderAmount],
        ].map(([label, value]) => (
          <Panel key={String(label)}>
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-lg font-bold">{formatNum(Number(value || 0))}</p>
          </Panel>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["CTR %", summary?.ctr],
          ["CVR %", summary?.cvr],
          ["CPC", summary?.cpc],
          ["CPA", summary?.cpa],
          ["ROAS %", summary?.roas],
        ].map(([label, value]) => (
          <Panel key={String(label)}>
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-lg font-bold">{Number(value || 0).toLocaleString("ko-KR")}</p>
          </Panel>
        ))}
      </div>

      <Panel title="필터">
        <div className="flex flex-wrap gap-3">
          <Field label="플랫폼">
            <TextSelect value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
              <option value="">전체</option>
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </TextSelect>
          </Field>
          <Field label="점포">
            <TextSelect value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
              <option value="">전체</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </TextSelect>
          </Field>
        </div>
      </Panel>

      <Panel title="일별 광고비">
        <TableShell>
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-2 py-2">날짜</th>
              <th className="px-2 py-2">점포</th>
              <th className="px-2 py-2">플랫폼</th>
              <th className="px-2 py-2">지출</th>
              <th className="px-2 py-2">노출</th>
              <th className="px-2 py-2">클릭</th>
              <th className="px-2 py-2">주문</th>
              <th className="px-2 py-2">주문금액</th>
              <th className="px-2 py-2">CTR</th>
              <th className="px-2 py-2">CVR</th>
              <th className="px-2 py-2">CPC</th>
              <th className="px-2 py-2">ROAS</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {costs.map((c) => (
              <tr key={c.id} className="border-b border-line/70 text-sm">
                <td className="px-2 py-1.5 whitespace-nowrap">{dateKey(c.costDate)}</td>
                <td className="px-2 py-1.5">{c.store?.name}</td>
                <td className="px-2 py-1.5">{c.platform?.name}</td>
                <td className="px-2 py-1.5 tabular-nums">{formatNum(c.adSpend)}</td>
                <td className="px-2 py-1.5 tabular-nums">{formatNum(c.impressions)}</td>
                <td className="px-2 py-1.5 tabular-nums">{formatNum(c.clicks)}</td>
                <td className="px-2 py-1.5 tabular-nums">{formatNum(c.orders)}</td>
                <td className="px-2 py-1.5 tabular-nums">{formatNum(c.orderAmount)}</td>
                <td className="px-2 py-1.5 tabular-nums">{Number(c.ctr)}</td>
                <td className="px-2 py-1.5 tabular-nums">{Number(c.cvr)}</td>
                <td className="px-2 py-1.5 tabular-nums">{formatNum(c.cpc)}</td>
                <td className="px-2 py-1.5 tabular-nums">{Number(c.roas)}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  <Button type="button" size="sm" variant="ghost" onClick={() => openEdit(c)}>
                    수정
                  </Button>
                  <Button type="button" size="sm" variant="danger" onClick={() => deleteCost(c.id)}>
                    삭제
                  </Button>
                </td>
              </tr>
            ))}
            {costs.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-2 py-6 text-center text-sm text-muted">
                  데이터가 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </TableShell>
      </Panel>

      {showForm ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveCost} className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-panel bg-card p-4 shadow-lg">
            <h3 className="font-semibold">{form.id ? "광고비 수정" : "광고비 입력"}</h3>
            {!form.id ? (
              <>
                <Field label="점포(자사)">
                  <TextSelect
                    value={form.storeId}
                    onChange={(e) => setForm({ ...form, storeId: e.target.value })}
                    required
                  >
                    <option value="">선택</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.platform?.name})
                      </option>
                    ))}
                  </TextSelect>
                </Field>
                <Field label="날짜">
                  <TextInput type="date" value={form.costDate} onChange={(e) => setForm({ ...form, costDate: e.target.value })} required />
                </Field>
              </>
            ) : (
              <p className="text-sm text-muted">
                {form.costDate} · 점포/날짜는 수정하지 않습니다 (원본과 동일).
              </p>
            )}
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
            <Field label="메모">
              <TextInput value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <div className="grid grid-cols-5 gap-2 rounded-btn bg-paper p-2 text-center text-xs">
              <div>CTR {preview.ctr}</div>
              <div>CVR {preview.cvr}</div>
              <div>CPC {preview.cpc}</div>
              <div>CPA {preview.cpa}</div>
              <div>ROAS {preview.roas}</div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
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
