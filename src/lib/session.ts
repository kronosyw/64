import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canAccessOps, canManageBranches, canViewMemo } from "@/lib/roles";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
}

export async function requireOpsSession() {
  const session = await requireSession();
  if (!canAccessOps(session.user.role)) {
    redirect("/");
  }
  return session;
}

export async function requireOwnerSession() {
  const session = await requireSession();
  if (!canManageBranches(session.user.role)) {
    redirect("/");
  }
  return session;
}

export function assertBranchAccess(branchIds: number[], branchId: number) {
  if (!branchIds.includes(branchId)) {
    throw new Error("지점 접근 권한이 없습니다.");
  }
}

export function pickBranchId(branchIds: number[], requested?: number | null) {
  if (!branchIds.length) return null;
  if (requested && branchIds.includes(requested)) return requested;
  return branchIds[0];
}

export function staffOnlySchedule(role: Role) {
  return role === Role.STAFF || role === Role.PARTTIME;
}

export function memoAllowed(role: Role) {
  return canViewMemo(role);
}
