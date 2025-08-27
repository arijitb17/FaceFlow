import { queryClient } from "@/lib/queryClient";

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: "admin" | "teacher" | "student";
  email?: string;
  isActive: boolean;
  teacher?: any;
  student?: any;
}

export const getAuthToken = (): string | null => {
  return localStorage.getItem("authToken");
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem("authToken", token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem("authToken");
};

export const logout = (): void => {
  removeAuthToken();
  queryClient.clear();
  window.location.href = "/login";
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

export const requireAuth = (): void => {
  if (!isAuthenticated()) {
    window.location.href = "/login";
  }
};

export const requireRole = (allowedRoles: string[]): void => {
  // This will be implemented with the current user context
  requireAuth();
};
