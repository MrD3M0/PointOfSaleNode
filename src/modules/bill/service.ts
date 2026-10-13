// bill/service.ts
import { prismaMain } from "@/lib/prismaClient";
import { Prisma } from "@/generated/prisma/client";
import { CustomError, ValidationError } from "@/errors/CustomError";
import { T_BillCreateInput } from "./validator";

const billInclude = {
  billItems: {
    include: {
      product: { include: { category: true } },
      batch: true,
    },
  },
  user: {
    select: { id: true, username: true, email: true },
  },
} satisfies Prisma.BillInclude;

const round2 = (n: number) => Math.round(n * 100) / 100;

const calcFinalAmount = (
  total: number,
  discountType: "Exact" | "Percentage",
  discount: number,
) => {
  if (discountType === "Percentage") {
    if (discount > 100)
      throw new ValidationError({
        discount: "Percentage discount cannot exceed 100",
      });
    return round2(total - (total * discount) / 100);
  }
  if (discount > total)
    throw new ValidationError({
      discount: "Discount cannot be greater than the bill total",
    });
  return round2(total - discount);
};

// Validates the batches and prepares bill item rows (price comes from the batch)
const buildBillItems = async (
  lines: T_BillCreateInput["products"],
  userId: string,
) => {
  // Merge duplicate batches into one line
  const merged = new Map<string, number>();
  for (const line of lines) {
    merged.set(line.batchId, (merged.get(line.batchId) ?? 0) + line.quantity);
  }

  const batchIds = [...merged.keys()];
  const dbBatches = await prismaMain.batch.findMany({
    where: { id: { in: batchIds }, product: { userId } },
  });

  if (dbBatches.length !== batchIds.length)
    throw new ValidationError({
      products: "One or more batches not found or don't belong to this user",
    });

  let total = 0;
  const items = batchIds.map((batchId) => {
    const batch = dbBatches.find((b) => b.id === batchId);
    if (!batch) throw new CustomError("Batch not found", 404);

    const quantity = merged.get(batchId) ?? 0;
    const unitPrice = batch.price.toNumber();
    const itemTotal = round2(unitPrice * quantity);
    total += itemTotal;

    return {
      productId: batch.productId,
      batchId,
      quantity,
      unitPrice,
      total: itemTotal,
    };
  });

  return { items, total: round2(total) };
};

// Decrease batch stock, fails if a batch doesn't have enough quantity
const takeStock = async (
  tx: Prisma.TransactionClient,
  items: { batchId: string; quantity: number }[],
) => {
  for (const item of items) {
    const result = await tx.batch.updateMany({
      where: { id: item.batchId, quantity: { gte: item.quantity } },
      data: { quantity: { decrement: item.quantity } },
    });

    if (result.count === 0) {
      const batch = await tx.batch.findUnique({
        where: { id: item.batchId },
        select: {
          batchNumber: true,
          quantity: true,
          product: { select: { name: true } },
        },
      });
      throw new ValidationError({
        quantity: `Insufficient quantity in batch ${batch?.batchNumber} of ${batch?.product.name}. Available: ${batch?.quantity ?? 0}`,
      });
    }
  }
};

// Put sold quantities back into their batches
const returnStock = async (
  tx: Prisma.TransactionClient,
  items: { batchId: string; quantity: number }[],
) => {
  for (const item of items) {
    await tx.batch.update({
      where: { id: item.batchId },
      data: { quantity: { increment: item.quantity } },
    });
  }
};

export const BillService = {
  index: async (pageNumber: number, limitNumber: number, userId: string) => {
    const skip = (pageNumber - 1) * limitNumber;
    const take = limitNumber;

    const bills = await prismaMain.bill.findMany({
      where: { userId },
      include: billInclude,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });

    const totalBills = await prismaMain.bill.count({ where: { userId } });

    return {
      bills,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: totalBills,
      },
    };
  },

  create: async (data: T_BillCreateInput, userId: string) => {
    const { discountType, discount, products } = data;

    const { items, total } = await buildBillItems(products, userId);
    const finalBillAmount = calcFinalAmount(total, discountType, discount);

    return await prismaMain.$transaction(async (tx) => {
      await takeStock(tx, items);

      return await tx.bill.create({
        data: {
          userId,
          discountType,
          discount,
          total,
          finalBillAmount,
          billItems: { createMany: { data: items } },
        },
        include: billInclude,
      });
    });
  },

  getById: async (billId: string, userId: string) => {
    const bill = await prismaMain.bill.findFirst({
      where: { id: billId, userId },
      include: billInclude,
    });
    if (!bill) throw new CustomError("Bill not found", 404);
    return bill;
  },

  update: async (billId: string, data: T_BillCreateInput, userId: string) => {
    const existingBill = await prismaMain.bill.findFirst({
      where: { id: billId, userId },
      include: { billItems: true },
    });
    if (!existingBill) throw new CustomError("Bill not found", 404);

    const { discountType, discount, products } = data;
    const { items, total } = await buildBillItems(products, userId);
    const finalBillAmount = calcFinalAmount(total, discountType, discount);

    return await prismaMain.$transaction(async (tx) => {
      // Restore old quantities first, then take the new ones
      await returnStock(tx, existingBill.billItems);
      await tx.billItem.deleteMany({ where: { billId } });
      await takeStock(tx, items);

      return await tx.bill.update({
        where: { id: billId },
        data: {
          discountType,
          discount,
          total,
          finalBillAmount,
          billItems: { createMany: { data: items } },
        },
        include: billInclude,
      });
    });
  },

  delete: async (billId: string, userId: string) => {
    const bill = await prismaMain.bill.findFirst({
      where: { id: billId, userId },
      include: { billItems: true },
    });
    if (!bill) throw new CustomError("Bill not found", 404);

    return await prismaMain.$transaction(async (tx) => {
      await returnStock(tx, bill.billItems);
      await tx.billItem.deleteMany({ where: { billId } });
      return await tx.bill.delete({ where: { id: billId } });
    });
  },

  getBillsByDateRange: async (
    userId: string,
    startDate: Date,
    endDate: Date,
    pageNumber: number,
    limitNumber: number,
  ) => {
    const skip = (pageNumber - 1) * limitNumber;
    const take = limitNumber;

    const where: Prisma.BillWhereInput = {
      userId,
      createdAt: { gte: startDate, lte: endDate },
    };

    const bills = await prismaMain.bill.findMany({
      where,
      include: billInclude,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });

    const total = await prismaMain.bill.count({ where });

    return {
      bills,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
      },
    };
  },

  getTotalSales: async (userId: string) => {
    const result = await prismaMain.bill.aggregate({
      where: { userId },
      _sum: { finalBillAmount: true },
      _count: true,
    });

    return {
      totalBills: result._count,
      totalSales: result._sum.finalBillAmount?.toNumber() ?? 0,
    };
  },

  getBillsByCategory: async (
    userId: string,
    categoryId: string,
    pageNumber: number,
    limitNumber: number,
  ) => {
    const skip = (pageNumber - 1) * limitNumber;
    const take = limitNumber;

    const where: Prisma.BillWhereInput = {
      userId,
      billItems: { some: { product: { categoryId } } },
    };

    const bills = await prismaMain.bill.findMany({
      where,
      include: {
        billItems: {
          where: { product: { categoryId } },
          include: {
            product: { include: { category: true } },
            batch: true,
          },
        },
        user: {
          select: { id: true, username: true, email: true },
        },
      },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });

    const total = await prismaMain.bill.count({ where });

    return {
      bills,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
      },
    };
  },
};
