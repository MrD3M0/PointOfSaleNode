import { Request, Response, NextFunction } from "express";
import { AuthService } from "@/modules/auth/service";
import { CustomError } from "@/errors/CustomError";
import { T_Context } from "@/@types/type";
import { CookieManager } from "@/utils/cookies";
import { ErrorHandler } from "@/utils/error";
import { prismaMain } from "@/lib/prismaClient";

const getBearerToken = (req: Request) => {
  const header = req.headers.authorization;
  if (!header) return undefined;
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : undefined;
};

const resolveContext = async (
  req: Request,
  res: Response,
): Promise<T_Context> => {
  const token = req.cookies?.token || getBearerToken(req);
  const access = token ? AuthService.verifyToken(token, "access") : null;
  if (access && access.role) {
    return { userId: access.userId, role: access.role };
  }

  // Access token missing/expired: try the refresh token
  const refreshToken = req.cookies?.refreshToken;
  const refresh = refreshToken
    ? AuthService.verifyToken(refreshToken, "refresh")
    : null;
  if (!refresh) throw new CustomError("Unauthorized", 401);

  // Re-read the user so the role is always current (and deleted users are rejected)
  const user = await prismaMain.user.findUnique({
    where: { id: refresh.userId },
    select: { id: true, role: true },
  });
  if (!user) throw new CustomError("Unauthorized", 401);

  const newToken = AuthService.generateToken(user.id, user.role);
  res.cookie("token", newToken, CookieManager.accessToken());
  res.setHeader("X-New-Token", newToken);
  return { userId: user.id, role: user.role };
};

export const isUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    res.locals.context = await resolveContext(req, res);
    return next();
  } catch (error) {
    return ErrorHandler.handleError(res, error);
  }
};

export const isAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const context = await resolveContext(req, res);
    if (context.role !== "ADMIN")
      throw new CustomError("Forbidden: Admin access required", 403);
    res.locals.context = context;
    return next();
  } catch (error) {
    return ErrorHandler.handleError(res, error);
  }
};
