import { CustomError, ValidationError } from "@/errors/CustomError";
import { Prisma } from "@/generated/prisma/client";
import { AxiosError } from "axios";
import { Response } from "express";
import { z, ZodError } from "zod";
import { ResponseHandler } from "./response";

export const ErrorHandler = {
  handleError: function (res: Response, error: unknown) {
    if (error instanceof ValidationError)
      return ErrorHandler.handleValidationError(res, error);
    if (error instanceof CustomError)
      return ErrorHandler.handleCustomError(res, error);
    if (error instanceof ZodError)
      return ErrorHandler.handleZodError(res, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError)
      return ErrorHandler.handlePrismaError(res, error);
    if (error instanceof Prisma.PrismaClientValidationError)
      return ResponseHandler.error({
        res,
        code: 400,
        message: "Invalid request data",
        error: error,
      });
    if (error instanceof AxiosError)
      return ErrorHandler.handleAxiosError(res, error);

    // Log the real error server-side, never send internals to the client
    console.error("Unhandled error:", error);
    return ResponseHandler.error({
      res,
      code: 500,
      message: "Internal Server Error",
      error: error,
    });
  },

  handleCustomError: function (res: Response, error: CustomError) {
    return ResponseHandler.error({
      res,
      code: error.status || 500,
      message: error.message || "Internal Server Error",
      error: error,
    });
  },

  handleValidationError: function (res: Response, error: ValidationError) {
    return res.status(422).send({
      success: false,
      status: 422,
      message: "Validation Error",
      data: error.fields,
    });
  },

  handlePrismaError: function (
    res: Response,
    error: Prisma.PrismaClientKnownRequestError,
  ) {
    switch (error.code) {
      case "P2002":
        return ResponseHandler.error({
          res,
          code: 409,
          message: "A record with the same unique value already exists",
          error: error,
        });
      case "P2003":
        return ResponseHandler.error({
          res,
          code: 409,
          message: "This record is referenced by other records",
          error: error,
        });
      case "P2025":
        return ResponseHandler.error({
          res,
          code: 404,
          message: "Record not found",
          error: error,
        });
      default:
        console.error("Prisma error:", error);
        return ResponseHandler.error({
          res,
          code: 500,
          message: "Internal Server Error",
          error: error,
        });
    }
  },

  handleZodError: function (res: Response, error: ZodError) {
    const flattenedErrors: Record<string, unknown> = z.flattenError(error)
      .fieldErrors as Record<string, unknown>;

    // Respect custom data thrown via zod's params
    for (const issue of error.issues) {
      for (const path of issue.path) {
        if ("params" in issue && issue.params) {
          flattenedErrors[String(path)] = issue.params;
        }
      }
    }

    return res.status(422).send({
      success: false,
      status: 422,
      message: "Validation Error",
      data: flattenedErrors,
    });
  },

  handleAxiosError: function (res: Response, error: AxiosError) {
    const status = error.response?.status || 500;
    const responseData = error.response?.data as
      | { message?: string }
      | undefined;
    const message = responseData?.message || error.message || "Request failed";
    return ResponseHandler.error({ res, code: status, message, error: error });
  },
};
