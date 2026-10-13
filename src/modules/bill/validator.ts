import z from "zod";

export const billCreateInputSchema = z
  .object({
    discountType: z.enum(["Exact", "Percentage"], {
      message: "Discount type must be Exact or Percentage",
    }),
    discount: z
      .number({ message: "Discount is required" })
      .nonnegative("Discount cannot be negative")
      .default(0),
    products: z
      .array(
        z.object({
          batchId: z
            .string({ message: "Batch ID is required" })
            .min(1, "Batch ID is required"),
          quantity: z
            .number({ message: "Quantity is required" })
            .int("Quantity must be an integer")
            .positive("Quantity must be greater than 0"),
        }),
      )
      .min(1, "At least one product is required"),
  })
  .superRefine((val, ctx) => {
    if (val.discountType === "Percentage" && val.discount > 100) {
      ctx.addIssue({
        code: "custom",
        path: ["discount"],
        message: "Percentage discount cannot exceed 100",
      });
    }
  });

export type T_BillCreateInput = z.infer<typeof billCreateInputSchema>;

export const validateBillCreate = (data: unknown) =>
  billCreateInputSchema.parse(data);
