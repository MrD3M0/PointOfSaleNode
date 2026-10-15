import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { randomUUID } from "crypto";
import { trimBody } from "./middlewares/trimBody";
import appRoutes from "./router";
import { prismaMain } from "./lib/prismaClient";
import { seedDefaultAdmin } from "./dev/seed-default-admin";
import { ErrorHandler } from "./utils/error";
import { ResponseHandler } from "./utils/response";
import morgan from 'morgan'
const app = express();

app.use(helmet());
app.use(morgan("dev"))
const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // allow non-browser clients (curl, Postman) that send no Origin
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.locals.requestId = randomUUID();
  res.setHeader("X-Request-Id", res.locals.requestId);
  next();
});
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api", [trimBody], appRoutes);

// 404
app.use((_req: Request, res: Response) => ResponseHandler.notfound({ res }));

// Global error handler (malformed JSON, anything uncaught)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (
    (err as { status?: number })?.status === 400 &&
    err instanceof SyntaxError
  )
    return ResponseHandler.error({
      res,
      code: 400,
      message: "Malformed JSON body",
      error: null,
    });
  return ErrorHandler.handleError(res, err);
});

async function main() {
  try {
    await prismaMain.$connect();
    console.log("Database connected");
    await seedDefaultAdmin();
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running at PORT:${process.env.PORT || 8000}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

main();
