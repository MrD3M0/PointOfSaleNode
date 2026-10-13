// product/controller.ts
import { ErrorHandler } from "@/utils/error";
import { queryFilters } from "@/utils/queryFilters";
import { ResponseHandler } from "@/utils/response";
import { Request, Response } from "express";
import { validateProductCreate, validateProductUpdate } from "./validator";
import { ProductService } from "./service";

const ProductController = {
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
      const result = await ProductService.index(
        pageNumber,
        limitNumber,
        searchTerm,
        userId,
      );

      return ResponseHandler.success({
        res,
        code: 200,
        message: "Products fetched successfully!",
        data: {
          data: result.products,
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

      // Validate the data from the User
      const data = validateProductCreate(req.body);

      // Call the service
      const product = await ProductService.create(data, userId);

      // Return the response
      return ResponseHandler.success({
        res,
        code: 201,
        message: "Product created successfully",
        data: product,
      });
    } catch (error) {
      // If error occurs, handle the error
      return ErrorHandler.handleError(res, error);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.context.userId;
      const productId = req.params.id as string;
      const product = await ProductService.getById(productId, userId);
      return ResponseHandler.success({
        res,
        code: 200,
        message: "Product fetched successfully",
        data: product,
      });
    } catch (error) {
      return ErrorHandler.handleError(res, error);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.context.userId;
      const productId = req.params.id as string;
      const data = validateProductUpdate(req.body);
      const product = await ProductService.update(productId, data, userId);
      return ResponseHandler.success({
        res,
        code: 200,
        message: "Product updated successfully",
        data: product,
      });
    } catch (error) {
      return ErrorHandler.handleError(res, error);
    }
  },

  getByCategoryId: async (req: Request, res: Response) => {
    try {
      // Get the user info from the response locals
      const context = res.locals.context;

      // Get the user id from the context
      const userId = context.userId;

      // Get the category id from params
      const categoryId = req.params.categoryId as string;

      // Call the service
      const products = await ProductService.getByCategoryId(categoryId, userId);

      return ResponseHandler.success({
        res,
        code: 200,
        message: "Products fetched successfully",
        data: products,
      });
    } catch (error) {
      // If error occurs, handle the error
      return ErrorHandler.handleError(res, error);
    }
  },
  delete: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.context.userId;
      const productId = req.params.id as string;
      await ProductService.delete(productId, userId);
      return ResponseHandler.success({
        res,
        code: 200,
        message: "Product deleted successfully",
        data: null,
      });
    } catch (error) {
      return ErrorHandler.handleError(res, error);
    }
  },
};

export default ProductController;
