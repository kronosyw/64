"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useId, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { roleLabel } from "@/lib/roles";
import { SignOutButton } from "@/components/SignOutButton";

const LINKS = [
  { href: "/", label: "일정", roles: ["SUPERADMIN", "OWNER", "MANAGER", "STAFF", "PARTTIME"] },
  { href: "/board", label: "게시판", roles: ["SUPERADMIN", "OWNER", "MANAGER"] },
  { href: "/attendance", label: "근태", roles: ["SUPERADMIN", "OWNER", "MANAGER"] },
  { href: "/employees", label: "직원", roles: ["SUPERADMIN", "OWNER", "MANAGER"] },
  { href: "/payroll", label: "급여", roles: ["SUPERADMIN", "OWNER", "MANAGER"] },
  { href: "/statistics", label: "통계", roles: ["SUPERADMIN", "OWNER", "MANAGER"] },
  { href: "/ads", label: "광고", roles: ["SUPERADMIN", "OWNER", "MANAGER"] },
  { href: "/vault", label: "정보저장", roles: ["SUPERADMIN", "OWNER"] },
  { href: "/branches", label: "지점", roles: ["SUPERADMIN", "OWNER"] },
  { href: "/settings", label: "설정", roles: ["SUPERADMIN", "OWNER", "MANAGER"] },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  links,
  pathname,
  onNavigate,
}: {
  links: typeof LINKS;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5 px-2" aria-label="주요 메뉴">
      {links.map((link) => {
        const active = isActivePath(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={`nav-side ${active ? "nav-side-active" : "nav-side-idle"}`}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBrand() {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <BrandMark size={36} />
      <div className="min-w-0">
        <Link href="/" className="block text-lg font-bold tracking-tight text-foreground">
          잉잉관리자
        </Link>
        <p className="text-xs text-muted">운영 데스크</p>
      </div>
    </div>
  );
}

function SidebarFooter({ name, role }: { name: string; role: string }) {
  return (
    <div className="mt-auto border-t border-line px-4 py-4">
      <p className="truncate text-sm font-medium text-foreground">{name || "계정"}</p>
      {role ? <p className="mt-0.5 truncate text-xs text-muted">{roleLabel(role)}</p> : null}
      <div className="mt-3 [&_button]:w-full">
        <SignOutButton />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data } = useSession();
  const role = data?.user?.role ?? "";
  const name = data?.user?.name ?? "";
  const links = LINKS.filter((link) => !role || link.roles.includes(role));
  const [menuOpen, setMenuOpen] = useState(false);
  const titleId = useId();
  const isAds = pathname.startsWith("/ads");

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen text-foreground md:flex">
      {/* Desktop sidebar */}
      <aside className="app-sidebar no-print sticky top-0 hidden h-screen w-60 shrink-0 md:flex">
        <SidebarBrand />
        <div className="flex-1 overflow-y-auto py-1">
          <NavLinks links={links} pathname={pathname} />
        </div>
        <SidebarFooter name={name} role={role} />
      </aside>

      {/* Mobile top bar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-topbar no-print md:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <BrandMark size={32} />
              <Link href="/" className="truncate text-base font-bold tracking-tight text-foreground">
                잉잉관리자
              </Link>
            </div>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-btn border border-line bg-card text-foreground hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/80"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-drawer"
              onClick={() => setMenuOpen(true)}
            >
              <span className="sr-only">메뉴 열기</span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </header>

        {/* Mobile drawer */}
        {menuOpen ? (
          <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <button
              type="button"
              className="absolute inset-0 bg-foreground/35 backdrop-blur-[2px]"
              aria-label="메뉴 닫기"
              onClick={() => setMenuOpen(false)}
            />
            <div
              id="mobile-nav-drawer"
              className="app-sidebar absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col shadow-lift"
            >
              <div className="flex items-center justify-between gap-2 border-b border-line pr-2">
                <div id={titleId}>
                  <SidebarBrand />
                </div>
                <button
                  type="button"
                  className="mr-2 inline-flex h-9 w-9 items-center justify-center rounded-btn text-muted hover:bg-paper hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/80"
                  aria-label="메뉴 닫기"
                  onClick={() => setMenuOpen(false)}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                    <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                <NavLinks links={links} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
              </div>
              <SidebarFooter name={name} role={role} />
            </div>
          </div>
        ) : null}

        <main className={`mx-auto w-full flex-1 px-4 py-6 ${isAds ? "max-w-[1400px]" : "max-w-6xl"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
