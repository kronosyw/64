import { Role } from "@prisma/client";

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "사장",
  MANAGER: "지점장",
  STAFF: "직원",
  PARTTIME: "파트타임",
};

export const WORK_TYPE_LABEL = {
  OPEN: "오픈",
  CLOSE: "마감",
  OPEN_CLOSE: "오픈마감",
  EVENING_PT: "저녁PT",
  FULL_PT: "풀타임PT",
  OFF: "휴무",
} as const;

export type WorkTypeKey = keyof typeof WORK_TYPE_LABEL;

export function isOwner(role: Role) {
  return role === Role.OWNER;
}

export function isManagerOrOwner(role: Role) {
  return role === Role.OWNER || role === Role.MANAGER;
}

export function canEditSchedule(role: Role) {
  return isManagerOrOwner(role);
}

export function canViewMemo(role: Role) {
  return isManagerOrOwner(role);
}

export function canManageBranches(role: Role) {
  return isOwner(role);
}

export function canAccessOps(role: Role) {
  return isManagerOrOwner(role);
}

export function labelToRole(label: string): Role | null {
  const entry = Object.entries(ROLE_LABEL).find(([, v]) => v === label);
  return entry ? (entry[0] as Role) : null;
}
