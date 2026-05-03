import type { Response } from "express";

export const OAUTH_RESUME_COOKIE = "oauth_resume_path";

/** Safe resume target: must start with /authorize? */
export function normalizeResumePath(raw: string | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/authorize?")) return null;
  if (trimmed.includes("\r") || trimmed.includes("\n")) return null;
  return trimmed;
}

export function clearOAuthResumeCookie(res: Response): void {
  res.clearCookie(OAUTH_RESUME_COOKIE, { path: "/" });
}

export function setOAuthResumeCookie(res: Response, resumePath: string): void {
  res.cookie(OAUTH_RESUME_COOKIE, resumePath, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60 * 1000,
  });
}
