import type { Request } from "express";

type Query = {
  limit?: unknown;
  page?: unknown;
  search?: unknown;
};

const toInt = (value: unknown, fallback: number) => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? n : fallback;
};

export function queryFilters(req: Request) {
  const source = (req.query ?? {}) as Query;
  const page = Math.min(1_000_000, Math.max(1, toInt(source.page, 1)));
  const limit = Math.min(100, Math.max(1, toInt(source.limit, 10)));
  const search = typeof source.search === "string" ? source.search.trim() : "";
  return { limit, page, search };
}

export const calculateSkipAndTake = (
  page: number,
  limit: number,
): { skip: number; take: number | undefined } => {
  const skip = limit === -1 ? 0 : (page - 1) * limit;
  const take = limit !== -1 ? limit : undefined;
  return { skip, take };
};
