import { PrismaClient } from "@prisma/client";
import "./seeds/entitlements";

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    const admin = await prisma.user.upsert({
      where: { email: "admin@screencold.com" },
      create: {
        email: "admin@screencold.com",
        name: "Admin",
        userRoles: {
          create: [{ role: "ADMIN" }, { role: "USER" }],
        },
      },
      update: {},
    });
    console.log("Admin user created:", admin.email);
  } else {
    console.log("Users already exist, skipping seed");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
