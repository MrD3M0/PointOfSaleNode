// batch/service.ts
import { prismaMain } from "@/lib/prismaClient";
import { Prisma } from "@/generated/prisma/client";
import { CustomError, ValidationError } from "@/errors/CustomError";
import { dateStamp, startOfToday } from "@/utils/batchNumber";
import { T_BatchCreateInput, T_BatchUpdateInput } from "./validator";

export const BatchService = {
  getByProductId: async (productId: string, userId: string) => {
    return await prismaMain.batch.findMany({
      where: { productId, product: { userId } },
      orderBy: { createdAt: "asc" },
    });
  },

  getById: async (batchId: string, userId: string) => {
    const batch = await prismaMain.batch.findFirst({
      where: { id: batchId, product: { userId } },
    });
    if (!batch) throw new CustomError("Batch not found", 404);
    return batch;
  },

  create: async (data: T_BatchCreateInput, userId: string) => {
    const product = await prismaMain.product.findFirst({
      where: { id: data.productId, userId },
    });
    if (!product) throw new CustomError("Product not found", 404);

    for (let attempt = 0; attempt < 5; attempt++) {
      let batchNumber = data.batchNumber;

      if (!batchNumber) {
        const todayCount = await prismaMain.batch.count({
          where: {
            productId: data.productId,
            createdAt: { gte: startOfToday() },
          },
        });
        batchNumber = `${dateStamp()}-${String(todayCount + 1 + attempt).padStart(2, "0")}`;
      }

      try {
        return await prismaMain.batch.create({
          data: {
            productId: data.productId,
            batchNumber,
            costPrice: data.costPrice,
            price: data.price,
            quantity: data.quantity,
          },
        });
      } catch (error) {
        const isDuplicate =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002";
        if (!isDuplicate) throw error;

        if (data.batchNumber)
          throw new ValidationError({
            batchNumber: "Batch number already exists for this product",
          });
        // Auto number collided, try the next number
      }
    }

    throw new CustomError("Could not generate a batch number", 500);
  },

  update: async (batchId: string, data: T_BatchUpdateInput, userId: string) => {
    const batch = await prismaMain.batch.findFirst({
      where: { id: batchId, product: { userId } },
    });
    if (!batch) throw new CustomError("Batch not found", 404);

    if (data.batchNumber && data.batchNumber !== batch.batchNumber) {
      const duplicate = await prismaMain.batch.findFirst({
        where: { productId: batch.productId, batchNumber: data.batchNumber },
      });
      if (duplicate)
        throw new ValidationError({
          batchNumber: "Batch number already exists for this product",
        });
    }

    return await prismaMain.batch.update({
      where: { id: batchId },
      data,
    });
  },

  delete: async (batchId: string, userId: string) => {
    const batch = await prismaMain.batch.findFirst({
      where: { id: batchId, product: { userId } },
    });
    if (!batch) throw new CustomError("Batch not found", 404);

    try {
      return await prismaMain.batch.delete({ where: { id: batchId } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      )
        throw new CustomError(
          "This batch is used in bills and can't be deleted",
          400,
        );
      throw error;
    }
  },
};
