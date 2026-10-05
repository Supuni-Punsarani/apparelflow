import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const supervisorHash = await bcrypt.hash("supervisor123", 10);
  const verifierHash = await bcrypt.hash("verifier123", 10);
  const sewingHash = await bcrypt.hash("sewing123", 10);

  await prisma.user.upsert({
    where: { email: "supervisor@apparelflow.com" },
    update: {},
    create: {
      email: "supervisor@apparelflow.com",
      passwordHash: supervisorHash,
      role: "cutting_supervisor",
      fullName: "Sarah Mitchell",
    },
  });

  await prisma.user.upsert({
    where: { email: "verifier@apparelflow.com" },
    update: {},
    create: {
      email: "verifier@apparelflow.com",
      passwordHash: verifierHash,
      role: "cutting_verifier",
      fullName: "James Perera",
    },
  });

  await prisma.user.upsert({
    where: { email: "sewing@apparelflow.com" },
    update: {},
    create: {
      email: "sewing@apparelflow.com",
      passwordHash: sewingHash,
      role: "sewing_supervisor",
      fullName: "Nimal Fernando",
    },
  });

  await prisma.recipe.upsert({
    where: { recipeCode: "REC-BL01" },
    update: {},
    create: {
      recipeCode: "REC-BL01",
      name: "Casual Blouse",
      category: "Blouse",
      stdFabricYards: 1.8,
      wastageCap: 5.0,
      components: {
        create: [
          { componentName: "Front Body Panel", piecesPerGarment: 1 },
          { componentName: "Back Body Panel", piecesPerGarment: 1 },
          { componentName: "Sleeves (Left & Right)", piecesPerGarment: 2 },
          { componentName: "Collar & Stand", piecesPerGarment: 1 },
          { componentName: "Sleeve Cuffs", piecesPerGarment: 2 },
        ],
      },
    },
  });

  await prisma.recipe.upsert({
    where: { recipeCode: "REC-CT02" },
    update: {},
    create: {
      recipeCode: "REC-CT02",
      name: "Crop Top",
      category: "Crop Top",
      stdFabricYards: 1.1,
      wastageCap: 8.0,
      components: {
        create: [
          { componentName: "Front Chest Panel", piecesPerGarment: 1 },
          { componentName: "Back Support Panel", piecesPerGarment: 1 },
          { componentName: "Neck Binding Strip", piecesPerGarment: 1 },
          { componentName: "Hem Elastic Casing", piecesPerGarment: 1 },
          { componentName: "Side Strap Accents", piecesPerGarment: 2 },
        ],
      },
    },
  });

  console.log("Database seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
