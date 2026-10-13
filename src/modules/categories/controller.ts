import { prismaMain } from "@/lib/prismaClient";
import { ErrorHandler } from "@/utils/error";
import { calculateSkipAndTake, queryFilters } from "@/utils/queryFilters";
import { ResponseHandler } from "@/utils/response";
import { Request, Response } from "express";
import { validateCategoryCreate } from "./validator";
import { CategoryService } from "./service";

const CategoryController = {
  index: async (req: Request, res: Response) => {
    try {
      // Get the user info from the response locals
      const context = res.locals.context;

      // Get the user id from the context
      const userId = context.userId;

      // Get the request query for pagination and search
      const { limit, page, search } = queryFilters(req);

      const pageNumber = Number(page) || 1;
      const limitNumber = Number(limit) || 10;

      const searchTerm = typeof search === "string" ? search : "";

      // Call the service
      const result = await CategoryService.index(
        pageNumber,
        limitNumber,
        searchTerm,
        userId,
      );

      return ResponseHandler.success({
        res,
        code: 200,
        message: "Categories fetched successfully!",
        data: {
          data: result.categories,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      // Handle errors
      return ErrorHandler.handleError(res, error);
    }
  },
  create: async (req: Request, res: Response) => {
    try {
      // Get the user info from the response locals
      const context = res.locals.context;

      // Get the user id from the context
      const userId = context.userId;

      // Validated the data from the User
      const { name, shortName } = validateCategoryCreate(req.body);

      // Call the service
      const category = await CategoryService.create(
        { name, shortName },
        userId,
      );

      // Return the response
      return ResponseHandler.success({
        res,
        code: 201,
        message: "Category created successfully",
        data: category,
      });
    } catch (error) {
      // If error occurs, handle the error
      return ErrorHandler.handleError(res, error);
    }
  },
  retrieve: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.context.userId;
      const categoryId = req.params.id as string;
      const category = await CategoryService.getById(categoryId, userId);
      return ResponseHandler.success({
        res,
        code: 200,
        message: "Category fetched successfully",
        data: category,
      });
    } catch (error) {
      return ErrorHandler.handleError(res, error);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.context.userId;
      const categoryId = req.params.id as string;
      const data = validateCategoryCreate(req.body);
      const category = await CategoryService.update(categoryId, data, userId);
      return ResponseHandler.success({
        res,
        code: 200,
        message: "Category updated successfully",
        data: category,
      });
    } catch (error) {
      return ErrorHandler.handleError(res, error);
    }
  },
};

export default CategoryController;
