import { prismaMain } from "@/lib/prismaClient";
import { Prisma } from "@/generated/prisma/client";
import { CustomError, ValidationError } from "@/errors/CustomError";
import { T_CategoryCreateInput } from "./validator";

const assertUnique = async (
  userId: string,
  data: T_CategoryCreateInput,
  excludeId?: string,
) => {
  const clash = await prismaMain.category.findFirst({
    where: {
      userId,
      ...(excludeId && { id: { not: excludeId } }),
      OR: [{ name: data.name }, { shortName: data.shortName }],
    },
  });
  if (!clash) return;

  const fields: Record<string, string> = {};
  if (clash.name === data.name)
    fields.name = "Category with the same name already exists";
  if (clash.shortName === data.shortName)
    fields.shortName = "Category with the same short name already exists";
  throw new ValidationError(fields);
};

const isUniqueError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

export const CategoryService = {
  index: async (
    page: number,
    limit: number,
    search: string,
    userId: string,
  ) => {
    const skip = (page - 1) * limit;
    const where: Prisma.CategoryWhereInput = {
      userId,
      ...(search && { name: { contains: search, mode: "insensitive" } }),
    };

    const categories = await prismaMain.category.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
    });
    const total = await prismaMain.category.count({ where });

    return { categories, pagination: { page, limit, total } };
  },

  create: async (data: T_CategoryCreateInput, userId: string) => {
    await assertUnique(userId, data);
    try {
      return await prismaMain.category.create({
        data: { name: data.name, shortName: data.shortName, userId },
      });
    } catch (error) {
      if (isUniqueError(error))
        throw new ValidationError({
          name: "Category with the same name or short name already exists",
        });
      throw error;
    }
  },

  getById: async (id: string, userId: string) => {
    const category = await prismaMain.category.findFirst({
      where: { id, userId },
    });
    if (!category) throw new CustomError("Category not found", 404);
    return category;
  },

  update: async (id: string, data: T_CategoryCreateInput, userId: string) => {
    const existing = await prismaMain.category.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new CustomError("Category not found", 404);

    await assertUnique(userId, data, id);
    try {
      return await prismaMain.category.update({
        where: { id },
        data: { name: data.name, shortName: data.shortName },
      });
    } catch (error) {
      if (isUniqueError(error))
        throw new ValidationError({
          name: "Category with the same name or short name already exists",
        });
      throw error;
    }
  },

  getByName: async (name: string, userId: string) =>
    prismaMain.category.findFirst({ where: { name, userId } }),

  getByShortName: async (shortName: string, userId: string) =>
    prismaMain.category.findFirst({ where: { shortName, userId } }),
};
