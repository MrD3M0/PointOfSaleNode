import { prismaMain } from "../../lib/prismaClient";
import { ResponseHandler } from "../../utils/response";
import { ValidateLogin, ValidateRegister } from "./validator";
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { ErrorHandler } from "@/utils/error";
import { AuthService } from "./service";
import { CookieManager } from "@/utils/cookies";

// Compared against when the user doesn't exist, so response time doesn't reveal valid emails
const DUMMY_HASH = bcrypt.hashSync("dummy-password", 10);

export const AuthController = {
  login: async (req: Request, res: Response) => {
    try {
      const { email, password } = ValidateLogin(req.body);

      const user = await prismaMain.user.findUnique({ where: { email } });
      const isPasswordValid = await bcrypt.compare(
        password,
        user?.password ?? DUMMY_HASH,
      );

      if (!user || !isPasswordValid)
        return ResponseHandler.error({
          res,
          code: 401,
          message: "Invalid Credentials",
          error: null,
        });

      const token = AuthService.generateToken(user.id, user.role);
      const refreshToken = AuthService.generateRefreshToken(user.id);

      res.cookie("token", token, CookieManager.accessToken());
      res.cookie("refreshToken", refreshToken, CookieManager.refreshToken());

      // Tokens live in httpOnly cookies only; they are not returned in the body
      return res.status(200).json({
        message: "Login successful!",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      return ErrorHandler.handleError(res, error);
    }
  },

  register: async (req: Request, res: Response) => {
    try {
      const { username, email, password } = ValidateRegister(req.body);

      const existingEmail = await prismaMain.user.findFirst({
        where: { email },
      });
      if (existingEmail)
        return ResponseHandler.error({
          res,
          code: 409,
          message: "Email is already taken.",
          error: null,
        });

      const existingUsername = await prismaMain.user.findFirst({
        where: { username },
      });
      if (existingUsername)
        return ResponseHandler.error({
          res,
          code: 409,
          message: "Username is already taken.",
          error: null,
        });

      const hashedPassword = await bcrypt.hash(password, 10);
      // Unique-constraint races fall through to ErrorHandler (P2002 -> 409)
      await prismaMain.user.create({
        data: { email, username, password: hashedPassword },
      });

      return res.status(201).json({ message: "Registered successfully!" });
    } catch (error) {
      return ErrorHandler.handleError(res, error);
    }
  },

  me: async (req: Request, res: Response) => {
    try {
      const context = res.locals.context;
      const user = await prismaMain.user.findUnique({
        where: { id: context.userId },
        select: { id: true, email: true, username: true, role: true },
      });

      if (!user)
        return ResponseHandler.error({
          res,
          code: 401,
          message: "Unauthorized",
          error: null,
        });

      return ResponseHandler.success({
        res,
        code: 200,
        message: "User fetched successfully!",
        data: user,
      });
    } catch (error) {
      return ErrorHandler.handleError(res, error);
    }
  },

  logout: async (_req: Request, res: Response) => {
    try {
      res.clearCookie("token", CookieManager.clear());
      res.clearCookie("refreshToken", CookieManager.clear());
      return res.status(200).json({ message: "Logged out successfully!" });
    } catch (error) {
      return ErrorHandler.handleError(res, error);
    }
  },
};
