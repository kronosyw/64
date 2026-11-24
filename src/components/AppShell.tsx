import Link from "next/link";
import { Role } from "@prisma/client";
import { BrandMark } from "@/components/BrandMark";
import { ROLE_LABEL } from "@/lib/roles";
import { SignOutButton } from "@/components/SignOutButton";

type Props = {
  children: React.ReactNode;
  name: string;
  role: Role;
  branchName?: string | null;
};

export function AppShell({ children, name, role, branchName }: Props) {
  const isOps = role === Role.OWNER || role === Role.MANAGER;
  const isOwner = role === Role.OWNER;

  const links = [
    { href: "/", label: "일정" },
    ...(isOps
      ? [
          { href: "/attendance", label: "근태" },
          { href: "/employees", label: "직원" },
          { href: "/payroll", label: "급여" },
          { href: "/statistics", label: "통계" },
          { href: "/ads", label: "광고" },
        ]
      : []),
    ...(isOwner ? [{ href: "/branches", label: "지점" }] : []),
    { href: "/account/password", label: "비밀번호" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <BrandMark size={32} />
            <div>
              <Link href="/" className="text-lg font-bold text-blue-800">
                잉잉관리자
              </Link>
              <p className="text-xs text-slate-500">
                {name} · {ROLE_LABEL[role]}
                {branchName ? ` · ${branchName}` : ""}
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-2.5 py-1.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-800"
              >
                {l.label}
              </Link>
            ))}
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
