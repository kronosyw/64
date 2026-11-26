"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { BrandMark } from "@/components/BrandMark";
import { roleLabel } from "@/lib/roles";
import { SignOutButton } from "@/components/SignOutButton";

const LINKS = [
  { href: "/", label: "일정", roles: ["SUPERADMIN", "OWNER", "MANAGER", "STAFF", "PARTTIME"] },
  { href: "/board", label: "게시판", roles: ["SUPERADMIN", "OWNER", "MANAGER", "STAFF", "PARTTIME"] },
  { href: "/attendance", label: "근태", roles: ["SUPERADMIN", "OWNER", "MANAGER"] },
  { href: "/employees", label: "직원", roles: ["SUPERADMIN", "OWNER", "MANAGER"] },
  { href: "/payroll", label: "급여", roles: ["SUPERADMIN", "OWNER", "MANAGER"] },
  { href: "/statistics", label: "통계", roles: ["SUPERADMIN", "OWNER", "MANAGER"] },
  { href: "/ads", label: "광고", roles: ["SUPERADMIN", "OWNER", "MANAGER"] },
  { href: "/vault", label: "정보저장", roles: ["SUPERADMIN", "OWNER"] },
  { href: "/branches", label: "지점", roles: ["SUPERADMIN", "OWNER"] },
  { href: "/settings", label: "설정", roles: ["SUPERADMIN", "OWNER", "MANAGER", "STAFF", "PARTTIME"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data } = useSession();
  const role = data?.user?.role ?? "";
  const name = data?.user?.name ?? "";
  const links = LINKS.filter((link) => !role || link.roles.includes(role));

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-30 bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-2.5">
              <BrandMark size={32} />
              <div>
                <Link href="/" className="text-lg font-bold text-paper">
                  잉잉관리자
                </Link>
                <p className="text-xs text-paper/70">
                  {name}
                  {role ? ` · ${roleLabel(role)}` : ""}
                </p>
              </div>
            </div>
            <SignOutButton />
          </div>
          <nav className="-mx-1 flex gap-1 overflow-x-auto pb-2">
            {links.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`shrink-0 border-b-2 px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "border-gold font-medium text-paper"
                      : "border-transparent text-paper/75 hover:text-paper"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className={`mx-auto px-4 py-6 ${pathname.startsWith("/ads") ? "max-w-[1400px]" : "max-w-6xl"}`}>{children}</main>
    </div>
  );
}
