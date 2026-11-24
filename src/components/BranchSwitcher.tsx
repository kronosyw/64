"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Branch = { id: number; name: string };

export function BranchSwitcher({
  branches,
  currentBranchId,
}: {
  branches: Branch[];
  currentBranchId: number | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (branches.length <= 1) {
    return (
      <div className="text-sm text-slate-600">
        지점: <span className="font-medium text-slate-900">{branches[0]?.name ?? "-"}</span>
      </div>
    );
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-slate-600">지점</span>
      <select
        className="rounded-md border border-slate-300 px-2 py-1.5"
        value={currentBranchId ?? ""}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("branchId", e.target.value);
          router.push(`${pathname}?${params.toString()}`);
        }}
      >
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </label>
  );
}
