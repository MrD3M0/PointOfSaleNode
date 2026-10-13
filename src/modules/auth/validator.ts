import z from "zod";

const emailField = z
  .string({ message: "Email is required" })
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: "A valid email is required" }));

const LoginSchema = z.object({
  email: emailField,
  password: z
    .string({ message: "Password is required" })
    .min(1, "Password is required")
    .max(72, "Password is too long"),
});

export type T_LoginSchema = z.infer<typeof LoginSchema>;
export function ValidateLogin(data: unknown): T_LoginSchema {
  return LoginSchema.parse(data);
}

const RegisterSchema = z.object({
  username: z
    .string({ message: "Username is required" })
    .trim()
    .min(1, { message: "Username cannot be empty" })
    .max(50, { message: "Username must be at most 50 characters" }),
  email: emailField,
  password: z
    .string({ message: "Password is required" })
    .min(6, { message: "Password must be at least 6 characters" })
    .max(72, { message: "Password must be at most 72 characters" }),
});

export type T_RegisterSchema = z.infer<typeof RegisterSchema>;
export function ValidateRegister(data: unknown): T_RegisterSchema {
  return RegisterSchema.parse(data);
}
