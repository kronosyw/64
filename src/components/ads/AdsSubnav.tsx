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
    <nav aria-label="광고 메뉴" className="mb-1 flex gap-1 overflow-x-auto rounded-btn border border-line bg-paper/60 p-1">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-[0.55rem] px-3.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 ${
              active
                ? "bg-ink font-semibold text-paper shadow-sm"
                : "font-medium text-muted hover:bg-card hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
