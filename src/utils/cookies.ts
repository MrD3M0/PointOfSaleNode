import "dotenv/config";
import type { CookieOptions } from "express";

const parseSeconds = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const defaultAccessTtl = parseSeconds(process.env.JWT_EXPIRES_IN, 900);
const defaultRefreshTtl = parseSeconds(
  process.env.JWT_REFRESH_EXPIRES_IN,
  86400,
);

// Use COOKIE_SAME_SITE=none only if your frontend is on a different site than the API
const requested = process.env.COOKIE_SAME_SITE;
const sameSite = (
  requested === "none" || requested === "strict" ? requested : "lax"
) as "lax" | "strict" | "none";

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" || sameSite === "none",
  sameSite,
};

const buildCookieOptions = (ttlSeconds: number): CookieOptions => ({
  ...baseCookieOptions,
  maxAge: ttlSeconds * 1000,
});

export const CookieManager = {
  accessToken: () => buildCookieOptions(defaultAccessTtl),
  refreshToken: () => buildCookieOptions(defaultRefreshTtl),
  clear: (): CookieOptions => ({ ...baseCookieOptions }),
};
