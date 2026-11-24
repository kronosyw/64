import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { canAccessOps, canManageBranches, canViewMemo } from "@/lib/roles";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

export function jsonOk<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

export async function getApiSession() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session;
}

export async function requireApiSession() {
  const session = await getApiSession();
  if (!session) throw new Response(JSON.stringify({ success: false, message: "로그인이 필요합니다." }), { status: 401 });
  return session;
}

export async function requireApiOps() {
  const session = await requireApiSession();
  if (!canAccessOps(session.user.role)) {
    throw new Response(JSON.stringify({ success: false, message: "접근 권한이 없습니다." }), { status: 403 });
  }
  return session;
}

export async function requireApiOwner() {
  const session = await requireApiSession();
  if (!canManageBranches(session.user.role)) {
    throw new Response(JSON.stringify({ success: false, message: "사장만 가능합니다." }), { status: 403 });
  }
  return session;
}

export async function requireApiMemo() {
  const session = await requireApiSession();
  if (!canViewMemo(session.user.role)) {
    throw new Response(JSON.stringify({ success: false, message: "메모 권한이 없습니다." }), { status: 403 });
  }
  return session;
}

export function ensureBranch(sessionBranchIds: number[], branchId: number) {
  if (!sessionBranchIds.includes(branchId)) {
    throw new Response(JSON.stringify({ success: false, message: "지점 접근 권한이 없습니다." }), { status: 403 });
  }
}

export function parseBranchId(raw: string | null, sessionBranchIds: number[]) {
  const n = raw ? Number(raw) : NaN;
  if (Number.isFinite(n) && sessionBranchIds.includes(n)) return n;
  return sessionBranchIds[0] ?? null;
}

export function isStaffRole(role: Role) {
  return role === Role.STAFF || role === Role.PARTTIME;
}
