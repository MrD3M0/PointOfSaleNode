import z from "zod";

export const productCreateInputSchema = z.object({
  name: z
    .string({ message: "Name is required" })
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  shortName: z
    .string({ message: "Short name is required" })
    .min(1, "Short name is required")
    .max(50, "Short name must be at most 50 characters"),
  categoryId: z
    .string({ message: "Category ID is required" })
    .min(1, "Category ID is required"),
  batch: z
    .object({
      costPrice: z
        .number({ message: "Cost price is required" })
        .positive("Cost price must be a positive number"),
      price: z
        .number({ message: "Price is required" })
        .positive("Price must be a positive number"),
      quantity: z
        .number({ message: "Quantity is required" })
        .int("Quantity must be an integer")
        .nonnegative("Quantity cannot be negative")
        .default(0),
    })
    .optional(),
});

// Updates can't carry a batch (use the /batch endpoints for stock and prices)
export const productUpdateInputSchema = productCreateInputSchema.omit({
  batch: true,
});

export type T_ProductCreateInput = z.infer<typeof productCreateInputSchema>;
export type T_ProductUpdateInput = z.infer<typeof productUpdateInputSchema>;

export const validateProductCreate = (data: unknown) =>
  productCreateInputSchema.parse(data);
export const validateProductUpdate = (data: unknown) =>
  productUpdateInputSchema.parse(data);