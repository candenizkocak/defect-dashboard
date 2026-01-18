// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'sysadmin';
  const adminPassword = 'admin'; // Change this in production!

  // 1. Hash the password
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  // 2. Upsert the Admin User
  const admin = await prisma.operator.upsert({
    where: { name: adminEmail },
    update: {}, // If exists, do nothing
    create: {
      name: adminEmail,
      password: hashedPassword,
      role: 'ADMIN', // <--- The Golden Ticket
    },
  });

  console.log(`🛡️  System Admin Created: ${admin.name} / ${adminPassword}`);
  console.log(`👉 Role: ${admin.role}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });