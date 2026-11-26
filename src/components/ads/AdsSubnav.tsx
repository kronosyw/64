"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/ads/reviews", label: "리뷰분석" },
  { href: "/ads/costs", label: "광고비" },
  { href: "/ads/statistics", label: "광고통계" },
];

export function AdsSubnav() {
  const pathname = usePathname();
  return (
    <div className="-mx-1 mb-4 flex gap-1 overflow-x-auto rounded-panel border border-line bg-card p-1">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-btn px-3.5 py-2 text-sm transition-colors ${
              active ? "bg-ink font-medium text-paper shadow-sm" : "text-muted hover:bg-paper hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
