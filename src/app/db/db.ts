import { UserRole } from "@prisma/client";
import bcrypt from "bcrypt";
import prisma from "../../shared/prisma";

export const initiateSuperAdmin = async () => {
  const payload = {
    fullName: "Super Admin",
    userName: "superAdmin",
    email: "superadmin@gmail10p.com",
    password: "123456",
    role: UserRole.SUPER_ADMIN,
  };

  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existingSuperAdmin) {
    return;
  }

  try {
    await prisma.$transaction(async (TransactionClient) => {
      const hashedPassword: string = await bcrypt.hash(payload.password, 12);

      await TransactionClient.user.create({
        data: {
          fullName: payload.fullName,
          email: payload.email,
          password: hashedPassword,
          role: payload.role,
        },
      });

      await TransactionClient.admin.create({
        data: {
          email: payload.email,
          password: hashedPassword,
        },
      });
    });
  } catch (err) {
    console.error("Error during super admin creation:", err);
  }
};
