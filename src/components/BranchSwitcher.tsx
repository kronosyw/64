"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Branch = { id: number; name: string };

function shortLabel(name: string) {
  const n = String(name || "").trim();
  if (n.includes("송파")) return "송파";
  if (n.includes("야탑")) return "분당야탑";
  if (n.includes("분당")) return "분당";
  return n.length > 10 ? `${n.slice(0, 10)}…` : n;
}

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
    <div
      role="group"
      aria-label="지점 선택"
      className="desk-toolbar max-w-full"
    >
      {branches.map((b) => {
        const active = b.id === currentBranchId;
        return (
          <button
            key={b.id}
            type="button"
            title={b.name}
            aria-pressed={active}
            className={`desk-chip shrink-0 ${active ? "desk-chip-active" : "desk-chip-idle"}`}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("branchId", String(b.id));
              router.push(`${pathname}?${params.toString()}`);
            }}
          >
            {shortLabel(b.name)}
          </button>
        );
      })}
    </div>
  );
}
