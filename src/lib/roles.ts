export const ROLE_LABEL = {
  SUPERADMIN: "최고관리자",
  OWNER: "사장",
  MANAGER: "지점장",
  STAFF: "직원",
  PARTTIME: "파트타임",
} as const;

export type AppRole = keyof typeof ROLE_LABEL;

export const WORK_TYPE_LABEL = {
  OPEN: "오픈",
  CLOSE: "마감",
  OPEN_CLOSE: "오픈마감",
  EVENING_PT: "저녁PT",
  FULL_PT: "풀타임PT",
  OFF: "휴무",
} as const;

export type WorkTypeKey = keyof typeof WORK_TYPE_LABEL;

export function roleLabel(role: string) {
  return ROLE_LABEL[role as AppRole] ?? role;
}

export function isSuperAdmin(role: string) {
  return role === "SUPERADMIN";
}

export function isOwner(role: string) {
  return role === "OWNER";
}

/** 사장 권한과 최고관리자. 최고관리자는 지점 제한 없이 전체를 본다. */
export function isOwnerLevel(role: string) {
  return role === "OWNER" || role === "SUPERADMIN";
}

export function isManagerOrOwner(role: string) {
  return role === "SUPERADMIN" || role === "OWNER" || role === "MANAGER";
}

export function canEditSchedule(role: string) {
  return isManagerOrOwner(role);
}

export function canViewMemo(role: string) {
  return isManagerOrOwner(role);
}

export function canManageBranches(role: string) {
  return isOwnerLevel(role);
}

export function canAccessOps(role: string) {
  return isManagerOrOwner(role);
}

/** Targets that support 활성/비활성/삭제 (사장 이하). */
export function isOwnerOrBelow(role: string) {
  return role === "OWNER" || role === "MANAGER" || role === "STAFF" || role === "PARTTIME";
}

/** Whether actor may change status/delete this employee. */
export function canManageEmployeeAccount(actorRole: string, targetRole: string) {
  if (targetRole === "SUPERADMIN") return actorRole === "SUPERADMIN";
  if (!isOwnerOrBelow(targetRole)) return false;
  if (actorRole === "SUPERADMIN" || actorRole === "OWNER") return true;
  if (actorRole === "MANAGER") {
    return targetRole === "STAFF" || targetRole === "PARTTIME";
  }
  return false;
}

export function labelToRole(label: string): AppRole | null {
  const entry = Object.entries(ROLE_LABEL).find(([, v]) => v === label);
  return entry ? (entry[0] as AppRole) : null;
}
