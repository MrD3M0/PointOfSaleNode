// batch/controller.ts
import { ErrorHandler } from "@/utils/error";
import { ResponseHandler } from "@/utils/response";
import { Request, Response } from "express";
import { validateBatchCreate, validateBatchUpdate } from "./validator";
import { BatchService } from "./service";

const BatchController = {
  getByProductId: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.context.userId;
      const productId = req.params.productId as string;

      const batches = await BatchService.getByProductId(productId, userId);

      return ResponseHandler.success({
        res,
        code: 200,
        message: "Batches fetched successfully",
        data: batches,
      });
    } catch (error) {
      return ErrorHandler.handleError(res, error);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.context.userId;
      const batchId = req.params.id as string;

      const batch = await BatchService.getById(batchId, userId);

      return ResponseHandler.success({
        res,
        code: 200,
        message: "Batch fetched successfully",
        data: batch,
      });
    } catch (error) {
      return ErrorHandler.handleError(res, error);
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.context.userId;
      const data = validateBatchCreate(req.body);

      const batch = await BatchService.create(data, userId);

      return ResponseHandler.success({
        res,
        code: 201,
        message: "Batch created successfully",
        data: batch,
      });
    } catch (error) {
      return ErrorHandler.handleError(res, error);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.context.userId;
      const batchId = req.params.id as string;
      const data = validateBatchUpdate(req.body);

      const batch = await BatchService.update(batchId, data, userId);

      return ResponseHandler.success({
        res,
        code: 200,
        message: "Batch updated successfully",
        data: batch,
      });
    } catch (error) {
      return ErrorHandler.handleError(res, error);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.context.userId;
      const batchId = req.params.id as string;

      await BatchService.delete(batchId, userId);

      return ResponseHandler.success({
        res,
        code: 200,
        message: "Batch deleted successfully",
        data: null,
      });
    } catch (error) {
      return ErrorHandler.handleError(res, error);
    }
  },
};

export default BatchController;
