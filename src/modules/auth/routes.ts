import { Router } from "express";

import { AuthController } from "./controller";
import { isUser } from "@/middlewares/isUser";
import rateLimit from "express-rate-limit";

const authRouter: Router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 429,
    message: "Too many attempts, try again later",
  },
});

authRouter.post("/login", loginLimiter, AuthController.login);
authRouter.post("/register", AuthController.register);
authRouter.get("/me", isUser, AuthController.me);
authRouter.post("/logout", AuthController.logout);

export default authRouter;
