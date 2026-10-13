// bill/controller.ts
import { ErrorHandler } from "@/utils/error";
import { queryFilters } from "@/utils/queryFilters";
import { ResponseHandler } from "@/utils/response";
import { Request, Response } from "express";
import { validateBillCreate } from "./validator";
import { BillService } from "./service";
// "2026-10-13" as endDate means the whole day, not midnight
const parseDay = (value: unknown, endOfDay: boolean) => {
  if (typeof value !== "string") return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(
    dateOnly ? `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}` : value,
  );
  return Number.isNaN(date.getTime()) ? null : date;
};
const BillController = {
  index: async (req: Request, res: Response) => {
    try {
      const context = res.locals.context;
      const userId = context.userId;

      const { limit, page } = queryFilters(req);
      const pageNumber = Number(page) || 1;
      const limitNumber = Number(limit) || 10;

      const result = await BillService.index(pageNumber, limitNumber, userId);

      return ResponseHandler.success({
        res,
        code: 200,
        message: "Bills fetched successfully!",
        data: {
          data: result.bills,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      return ErrorHandler.handleError(res, error);
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const context = res.locals.context;
      const userId = context.userId;

      const data = validateBillCreate(req.body);

      const bill = await BillService.create(data, userId);

      return ResponseHandler.success({
        res,
        code: 201,
        message: "Bill created successfully",
        data: bill,
      });
    } catch (error) {
      return ErrorHandler.handleError(res, error);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.context.userId;
      const billId = req.params.id as string;
      const bill = await BillService.getById(billId, userId);
      return ResponseHandler.success({
        res,
        code: 200,
        message: "Bill fetched successfully",
        data: bill,
      });
    } catch (error) {
      return ErrorHandler.handleError(res, error);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.context.userId;
      const billId = req.params.id as string;
      const data = validateBillCreate(req.body);
      const bill = await BillService.update(billId, data, userId);
      return ResponseHandler.success({
        res,
        code: 200,
        message: "Bill updated successfully",
        data: bill,
      });
    } catch (error) {
      return ErrorHandler.handleError(res, error);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.context.userId;
      const billId = req.params.id as string;
      await BillService.delete(billId, userId);
      return ResponseHandler.success({
        res,
        code: 200,
        message: "Bill deleted successfully",
        data: null,
      });
    } catch (error) {
      return ErrorHandler.handleError(res, error);
    }
  },

  getBillsByDateRange: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.context.userId;
      const start = parseDay(req.query.startDate, false);
      const end = parseDay(req.query.endDate, true);

      if (!start || !end)
        return ResponseHandler.error({
          res,
          code: 400,
          message: "startDate and endDate are required and must be valid dates",
          error: null,
        });

      const { page, limit } = queryFilters(req);
      const result = await BillService.getBillsByDateRange(
        userId,
        start,
        end,
        page,
        limit,
      );
      return ResponseHandler.success({
        res,
        code: 200,
        message: "Bills fetched successfully!",
        data: { data: result.bills, pagination: result.pagination },
      });
    } catch (error) {
      return ErrorHandler.handleError(res, error);
    }
  },

  getTotalSales: async (req: Request, res: Response) => {
    try {
      const context = res.locals.context;
      const userId = context.userId;

      const result = await BillService.getTotalSales(userId);

      return ResponseHandler.success({
        res,
        code: 200,
        message: "Total sales fetched successfully",
        data: result,
      });
    } catch (error) {
      return ErrorHandler.handleError(res, error);
    }
  },

  getBillsByCategory: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.context.userId;
      // the route is /category/:categoryId, so read it from params
      const categoryId = req.params.categoryId as string;
      const { page, limit } = queryFilters(req);

      const result = await BillService.getBillsByCategory(
        userId,
        categoryId,
        page,
        limit,
      );
      return ResponseHandler.success({
        res,
        code: 200,
        message: "Bills fetched successfully!",
        data: { data: result.bills, pagination: result.pagination },
      });
    } catch (error) {
      return ErrorHandler.handleError(res, error);
    }
  },
};

export default BillController;
