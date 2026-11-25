"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { TextSelect } from "@/components/ui";

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
      <div className="text-sm text-muted">
        지점: <span className="font-medium text-ink">{branches[0]?.name ?? "-"}</span>
      </div>
    );
  }

  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <span>지점</span>
      <TextSelect
        className="w-auto"
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
      </TextSelect>
    </label>
  );
}
