import { prismaMain } from "@/lib/prismaClient";
import { Prisma } from "@/generated/prisma/client";
import { CustomError, ValidationError } from "@/errors/CustomError";
import { dateStamp } from "@/utils/batchNumber";
import { T_ProductCreateInput, T_ProductUpdateInput } from "./validator";

const productInclude = {
  category: true,
  batches: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.ProductInclude;

const assertUnique = async (
  userId: string,
  data: { name: string; shortName: string },
  excludeId?: string,
) => {
  const clash = await prismaMain.product.findFirst({
    where: {
      userId,
      ...(excludeId && { id: { not: excludeId } }),
      OR: [{ name: data.name }, { shortName: data.shortName }],
    },
  });
  if (!clash) return;

  const fields: Record<string, string> = {};
  if (clash.name === data.name)
    fields.name = "Product with the same name already exists";
  if (clash.shortName === data.shortName)
    fields.shortName = "Product with the same short name already exists";
  throw new ValidationError(fields);
};

const assertCategory = async (categoryId: string, userId: string) => {
  const category = await prismaMain.category.findFirst({
    where: { id: categoryId, userId },
  });
  if (!category) throw new CustomError("Category not found", 404);
};

export const ProductService = {
  index: async (
    pageNumber: number,
    limitNumber: number,
    searchTerm: string,
    userId: string,
  ) => {
    const skip = (pageNumber - 1) * limitNumber;
    const where: Prisma.ProductWhereInput = {
      userId,
      ...(searchTerm && {
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { category: { name: { contains: searchTerm, mode: "insensitive" } } },
        ],
      }),
    };

    const products = await prismaMain.product.findMany({
      where,
      include: productInclude,
      skip,
      take: limitNumber,
      orderBy: { createdAt: "desc" },
    });
    const total = await prismaMain.product.count({ where });

    return {
      products,
      pagination: { page: pageNumber, limit: limitNumber, total },
    };
  },

  create: async (data: T_ProductCreateInput, userId: string) => {
    const { name, shortName, categoryId, batch } = data;

    await assertUnique(userId, { name, shortName });
    await assertCategory(categoryId, userId);

    return await prismaMain.product.create({
      data: {
        name,
        shortName,
        categoryId,
        userId,
        ...(batch && {
          batches: {
            create: {
              batchNumber: `${dateStamp()}-01`,
              costPrice: batch.costPrice,
              price: batch.price,
              quantity: batch.quantity,
            },
          },
        }),
      },
      include: productInclude,
    });
  },

  getById: async (productId: string, userId: string) => {
    const product = await prismaMain.product.findFirst({
      where: { id: productId, userId },
      include: productInclude,
    });
    if (!product) throw new CustomError("Product not found", 404);
    return product;
  },

  update: async (
    productId: string,
    data: T_ProductUpdateInput,
    userId: string,
  ) => {
    const existing = await prismaMain.product.findFirst({
      where: { id: productId, userId },
    });
    if (!existing) throw new CustomError("Product not found", 404);

    await assertCategory(data.categoryId, userId);
    await assertUnique(userId, data, productId);

    return await prismaMain.product.update({
      where: { id: productId },
      data: {
        name: data.name,
        shortName: data.shortName,
        categoryId: data.categoryId,
      },
      include: productInclude,
    });
  },

  getByName: async (name: string, userId: string) =>
    prismaMain.product.findFirst({
      where: { name, userId },
      include: productInclude,
    }),

  getByShortName: async (shortName: string, userId: string) =>
    prismaMain.product.findFirst({
      where: { shortName, userId },
      include: productInclude,
    }),

  getByCategoryId: async (categoryId: string, userId: string) =>
    prismaMain.product.findMany({
      where: { categoryId, userId },
      include: productInclude,
      orderBy: { createdAt: "desc" },
    }),

  delete: async (productId: string, userId: string) => {
    const product = await prismaMain.product.findFirst({
      where: { id: productId, userId },
    });
    if (!product) throw new CustomError("Product not found", 404);

    try {
      return await prismaMain.product.delete({ where: { id: productId } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      )
        throw new CustomError(
          "This product has sold batches in bills and can't be deleted",
          400,
        );
      throw error;
    }
  },
};
