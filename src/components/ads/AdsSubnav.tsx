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
    <nav aria-label="광고 메뉴" className="desk-toolbar mb-0 overflow-x-auto">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`desk-chip shrink-0 ${active ? "desk-chip-active" : "desk-chip-idle"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
