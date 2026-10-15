export const ACTIVITY_LOG_CATEGORIES = [
  "AUTH",
  "WALLET",
  "ORDER",
  "ACCOUNT",
  "ADMIN",
  "API",
  "SECURITY",
] as const;

export type ActivityLogCategory = (typeof ACTIVITY_LOG_CATEGORIES)[number];

export const ACTIVITY_LOG_ACTIONS = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "LOGIN_2FA",
  "LOGOUT",
  "REGISTER",
  "GOOGLE_LOGIN",
  "PASSWORD_CHANGE",
  "PASSWORD_RESET",
  "FORGOT_PASSWORD",
  "2FA_ENABLE",
  "2FA_DISABLE",
  "PROFILE_UPDATE",
  "AVATAR_UPLOAD",
  "PREMIUM_PURCHASE",
  "DEPOSIT_CREATE",
  "DEPOSIT_CREDITED",
  "DEPOSIT_CANCELLED",
  "PURCHASE",
  "WALLET_ADJUST",
  "USER_BAN",
  "USER_UNBAN",
  "USER_ROLE_CHANGE",
  "USER_UPDATE",
  "USER_DELETE",
  "IMPERSONATE",
  "API_KEY_CREATE",
  "API_KEY_ROTATE",
  "SPECIAL_PRICE_SET",
  "SPECIAL_PRICE_UPDATE",
  "SPECIAL_PRICE_CLEAR",
] as const;

export type ActivityLogAction = (typeof ACTIVITY_LOG_ACTIONS)[number];

export const ACTIVITY_CATEGORY_LABEL: Record<ActivityLogCategory, string> = {
  AUTH: "Auth",
  WALLET: "Wallet",
  ORDER: "Orders",
  ACCOUNT: "Account",
  ADMIN: "Admin",
  API: "API",
  SECURITY: "Security",
};

export const ACTIVITY_ACTION_LABEL: Record<ActivityLogAction, string> = {
  LOGIN_SUCCESS: "Login",
  LOGIN_FAILED: "Login failed",
  LOGIN_2FA: "2FA login",
  LOGOUT: "Logout",
  REGISTER: "Register",
  GOOGLE_LOGIN: "Google login",
  PASSWORD_CHANGE: "Password change",
  PASSWORD_RESET: "Password reset",
  FORGOT_PASSWORD: "Forgot password",
  "2FA_ENABLE": "2FA enabled",
  "2FA_DISABLE": "2FA disabled",
  PROFILE_UPDATE: "Profile update",
  AVATAR_UPLOAD: "Avatar upload",
  PREMIUM_PURCHASE: "Premium purchase",
  DEPOSIT_CREATE: "Deposit created",
  DEPOSIT_CREDITED: "Deposit credited",
  DEPOSIT_CANCELLED: "Deposit cancelled",
  PURCHASE: "Purchase",
  WALLET_ADJUST: "Wallet adjust",
  USER_BAN: "User banned",
  USER_UNBAN: "User unbanned",
  USER_ROLE_CHANGE: "Role change",
  USER_UPDATE: "User updated",
  USER_DELETE: "User deleted",
  IMPERSONATE: "Impersonate",
  API_KEY_CREATE: "API key created",
  API_KEY_ROTATE: "API key rotated",
  SPECIAL_PRICE_SET: "Special price set",
  SPECIAL_PRICE_UPDATE: "Special price updated",
  SPECIAL_PRICE_CLEAR: "Special price cleared",
};

export type ActivityLogRow = {
  id: string;
  userId: string | null;
  username: string | null;
  email: string | null;
  role: string | null;
  action: string;
  category: string;
  message: string;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  success: boolean;
  createdAt: string;
};

export type ActivityLogsPage = {
  items: ActivityLogRow[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  retentionDays: number;
};
