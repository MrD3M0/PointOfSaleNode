import { prismaMain } from "@/lib/prismaClient";
import * as bcrypt from "bcrypt";
import "dotenv/config";

export async function seedDefaultAdmin() {
  if (process.env.NODE_ENV === "production") return;

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const username = process.env.SEED_ADMIN_USERNAME || "admin";

  if (!email || !password) {
    console.log(
      "Admin seed skipped (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set).",
    );
    return;
  }

  try {
    const existingUser = await prismaMain.user.findUnique({ where: { email } });
    if (existingUser) {
      console.log("Default admin user already exists.");
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const adminUser = await prismaMain.user.create({
      data: { username, email, password: hashedPassword, role: "ADMIN" },
    });
    console.log(`Default admin created: ${adminUser.email}`);
  } catch (error) {
    console.error("Error creating default admin user:", error);
  }
}
