import jwt from "jsonwebtoken";
import "dotenv/config";

type TokenType = "access" | "refresh";

export type TokenPayload = {
  userId: string;
  role?: "USER" | "ADMIN";
  type: TokenType;
};

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined in .env");
  return secret;
};

export const AuthService = {
  generateToken: (userId: string, role: string): string =>
    jwt.sign({ userId, role, type: "access" }, getSecret(), {
      algorithm: "HS256",
      expiresIn: Number(process.env.JWT_EXPIRES_IN) || 900,
    }),

  generateRefreshToken: (userId: string): string =>
    jwt.sign({ userId, type: "refresh" }, getSecret(), {
      algorithm: "HS256",
      expiresIn: Number(process.env.JWT_REFRESH_EXPIRES_IN) || 86400,
    }),

  // Only accepts a token of the expected type, so a refresh token
  // can't be used as an access token (and vice versa)
  verifyToken: (token: string, type: TokenType): TokenPayload | null => {
    try {
      const decoded = jwt.verify(token, getSecret(), { algorithms: ["HS256"] });
      if (typeof decoded === "string" || decoded.type !== type) return null;
      return decoded as unknown as TokenPayload;
    } catch {
      return null;
    }
  },
};
