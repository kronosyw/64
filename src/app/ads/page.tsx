"use client";

import { FormEvent, useEffect, useState } from "react";

type Branch = { id: number; name: string };
type Platform = { id: number; name: string };
type Store = { id: number; name: string; platformId: number; platform?: Platform };
type Cost = {
  id: number;
  costDate: string;
  adSpend: number;
  clicks: number;
  orders: number;
  roas: string | number;
  store?: Store;
};
type Review = { id: number; reviewDate: string; reviewCount: number; store?: Store };
type Exposure = { id: number; exposureDate: string; regionName: string; rank: number | null; keyword: string | null };

export default function AdsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [exposures, setExposures] = useState<Exposure[]>([]);
  const [storeForm, setStoreForm] = useState({ name: "", platformId: "", storeType: "OWN" });
  const [costForm, setCostForm] = useState({
    storeId: "",
    platformId: "",
    costDate: "",
    adSpend: "",
    impressions: "",
    clicks: "",
    orders: "",
    orderAmount: "",
  });

  async function load(id: number) {
    const [ov, pl] = await Promise.all([
      fetch(`/api/ads?branchId=${id}`).then((r) => r.json()),
      fetch(`/api/ads?type=platforms`).then((r) => r.json()),
    ]);
    if (ov.success) {
      setStores(ov.stores);
      setCosts(ov.costs);
      setReviews(ov.reviews);
      setExposures(ov.exposures);
    }
    if (pl.success) {
      setPlatforms(pl.platforms);
      if (!storeForm.platformId && pl.platforms[0]) {
        setStoreForm((f) => ({ ...f, platformId: String(pl.platforms[0].id) }));
      }
    }
  }

  useEffect(() => {
    setCostForm((f) => ({ ...f, costDate: new Date().toISOString().slice(0, 10) }));
    fetch("/api/branches")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.branches.length) {
          setBranches(data.branches);
          setBranchId(data.branches[0].id);
        }
      });
  }, []);

  useEffect(() => {
    if (branchId) load(branchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  async function addStore(e: FormEvent) {
    e.preventDefault();
    if (!branchId) return;
    await fetch("/api/ads", {
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
    setStoreForm({ ...storeForm, name: "" });
    load(branchId);
  }

  async function addCost(e: FormEvent) {
    e.preventDefault();
    if (!branchId) return;
    const store = stores.find((s) => s.id === Number(costForm.storeId));
    await fetch("/api/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cost",
        branchId,
        storeId: Number(costForm.storeId),
        platformId: store?.platformId || Number(costForm.platformId),
        costDate: costForm.costDate,
        adSpend: Number(costForm.adSpend || 0),
        impressions: Number(costForm.impressions || 0),
        clicks: Number(costForm.clicks || 0),
        orders: Number(costForm.orders || 0),
        orderAmount: Number(costForm.orderAmount || 0),
      }),
    });
    load(branchId);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <a href="/" className="text-sm text-blue-700">
            ← 일정으로
          </a>
          <h1 className="mt-2 text-2xl font-bold">광고</h1>
        </div>
        <select
          className="rounded-md border px-2 py-1.5 text-sm"
          value={branchId ?? ""}
          onChange={(e) => setBranchId(Number(e.target.value))}
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={addStore} className="flex flex-wrap gap-2 rounded-xl border bg-white p-4">
        <input
          className="rounded-md border px-2 py-2"
          placeholder="점포명"
          value={storeForm.name}
          onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
          required
        />
        <select
          className="rounded-md border px-2 py-2"
          value={storeForm.platformId}
          onChange={(e) => setStoreForm({ ...storeForm, platformId: e.target.value })}
        >
          {platforms.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border px-2 py-2"
          value={storeForm.storeType}
          onChange={(e) => setStoreForm({ ...storeForm, storeType: e.target.value })}
        >
          <option value="OWN">자사</option>
          <option value="COMPETITOR">경쟁사</option>
        </select>
        <button type="submit" className="rounded-md bg-blue-700 px-3 py-2 text-white">
          점포 추가
        </button>
      </form>

      <form onSubmit={addCost} className="grid gap-2 rounded-xl border bg-white p-4 sm:grid-cols-3">
        <select
          className="rounded-md border px-2 py-2"
          value={costForm.storeId}
          onChange={(e) => setCostForm({ ...costForm, storeId: e.target.value })}
          required
        >
          <option value="">점포</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="rounded-md border px-2 py-2"
          value={costForm.costDate}
          onChange={(e) => setCostForm({ ...costForm, costDate: e.target.value })}
        />
        <input
          className="rounded-md border px-2 py-2"
          placeholder="광고비"
          value={costForm.adSpend}
          onChange={(e) => setCostForm({ ...costForm, adSpend: e.target.value })}
        />
        <input
          className="rounded-md border px-2 py-2"
          placeholder="노출"
          value={costForm.impressions}
          onChange={(e) => setCostForm({ ...costForm, impressions: e.target.value })}
        />
        <input
          className="rounded-md border px-2 py-2"
          placeholder="클릭"
          value={costForm.clicks}
          onChange={(e) => setCostForm({ ...costForm, clicks: e.target.value })}
        />
        <input
          className="rounded-md border px-2 py-2"
          placeholder="주문"
          value={costForm.orders}
          onChange={(e) => setCostForm({ ...costForm, orders: e.target.value })}
        />
        <input
          className="rounded-md border px-2 py-2"
          placeholder="주문금액"
          value={costForm.orderAmount}
          onChange={(e) => setCostForm({ ...costForm, orderAmount: e.target.value })}
        />
        <button type="submit" className="rounded-md bg-blue-700 px-3 py-2 text-white sm:col-span-2">
          광고비 저장
        </button>
      </form>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <h2 className="mb-2 font-semibold">광고비</h2>
          <div className="space-y-2 text-sm">
            {costs.map((c) => (
              <div key={c.id} className="rounded bg-slate-50 px-2 py-1">
                {String(c.costDate).slice(0, 10)} · {c.store?.name} · {c.adSpend.toLocaleString()}원 · ROAS{" "}
                {Number(c.roas).toFixed(1)}%
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <h2 className="mb-2 font-semibold">리뷰 / 노출</h2>
          <div className="space-y-2 text-sm">
            {reviews.map((r) => (
              <div key={r.id} className="rounded bg-slate-50 px-2 py-1">
                리뷰 {String(r.reviewDate).slice(0, 10)} · {r.store?.name} · {r.reviewCount}
              </div>
            ))}
            {exposures.map((x) => (
              <div key={x.id} className="rounded bg-slate-50 px-2 py-1">
                노출 {String(x.exposureDate).slice(0, 10)} · {x.regionName} · rank {x.rank ?? "-"}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
