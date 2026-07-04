export type UserRole = "admin" | "host";

export const USER_ROLE_STORAGE_KEY = "userRole";

export function isUserRole(value: string | null): value is UserRole {
  return value === "admin" || value === "host";
}
