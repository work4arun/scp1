import type { SystemRole } from "@prisma/client";

export const ROLE_LABELS: Record<SystemRole, string> = {
  SUPER_ADMIN: "Super Admin",
  CBO: "Chief Business Officer",
  SM: "Strategic Manager",
};

export function isSuperAdmin(role?: SystemRole | null) {
  return role === "SUPER_ADMIN";
}

export function isCBO(role?: SystemRole | null) {
  return role === "CBO" || role === "SUPER_ADMIN";
}

export function canManageTasks(role?: SystemRole | null) {
  return role === "SM" || role === "SUPER_ADMIN";
}

export function canConfigureSystem(role?: SystemRole | null) {
  return role === "SUPER_ADMIN" || role === "SM";
}

export function homePathForRole(role?: SystemRole | null) {
  switch (role) {
    case "SUPER_ADMIN":
      return "/admin";
    case "CBO":
      return "/cbo";
    case "SM":
      return "/sm";
    default:
      return "/login";
  }
}
