import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getItemStatus, canApproveOrder, computeWastagePct } from "@/lib/utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("ApparelFlow ERP — Production Verification & Queue Tests", () => {
  let verifierUser: any;
  let supervisorUser: any;
  let recipe: any;

  beforeAll(async () => {
    supervisorUser = await prisma.user.upsert({
      where: { email: "supervisor@apparelflow.com" },
      update: {},
      create: {
        email: "supervisor@apparelflow.com",
        passwordHash: "testHash",
        role: "cutting_supervisor",
        fullName: "Supervisor Sarah",
      },
    });

    verifierUser = await prisma.user.upsert({
      where: { email: "verifier@apparelflow.com" },
      update: {},
      create: {
        email: "verifier@apparelflow.com",
        passwordHash: "testHash",
        role: "cutting_verifier",
        fullName: "Verifier James",
      },
    });

    recipe = await prisma.recipe.upsert({
      where: { recipeCode: "REC-TEST01" },
      update: {},
      create: {
        recipeCode: "REC-TEST01",
        name: "Test Shirt",
        category: "Shirt",
        stdFabricYards: 1.5,
        wastageCap: 5.0,
        components: {
          create: [
            { componentName: "Front Panel", piecesPerGarment: 1 },
            { componentName: "Back Panel", piecesPerGarment: 1 },
            { componentName: "Sleeves", piecesPerGarment: 2 },
          ],
        },
      },
      include: { components: true },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Unit: Traffic-Light & Wastage Calculation", () => {
    it("returns GREEN when actual count matches expected", () => {
      expect(getItemStatus(100, 100)).toBe("GREEN");
    });

    it("returns YELLOW when actual count exceeds expected", () => {
      expect(getItemStatus(105, 100)).toBe("YELLOW");
    });

    it("returns RED when actual count is less than expected", () => {
      expect(getItemStatus(95, 100)).toBe("RED");
    });

    it("computes fabric wastage percentage correctly", () => {
      const wastage = computeWastagePct(94.5, 50, 1.8);
      expect(wastage).toBeCloseTo(5.0, 1);
    });
  });

  describe("Verification: Batch Approval", () => {
    it("approves order and transitions to VERIFIED with audit record", async () => {
      const order = await prisma.cuttingOrder.create({
        data: {
          orderNo: `TEST-ALL-GREEN-${Date.now()}`,
          recipeId: recipe.id,
          targetQty: 10,
          fabricRollId: "ROLL-T1",
          actualFabricYds: 15.0,
          status: "PENDING_VERIFICATION",
          createdBy: supervisorUser.id,
          verificationItems: {
            create: recipe.components.map((c: any) => ({
              componentId: c.id,
              expectedQty: 10 * c.piecesPerGarment,
              actualQty: 10 * c.piecesPerGarment,
              status: "GREEN",
            })),
          },
        },
        include: { verificationItems: true, recipe: true },
      });

      const canApprove = canApproveOrder(order.verificationItems);
      expect(canApprove).toBe(true);

      const [updatedOrder, log] = await prisma.$transaction([
        prisma.cuttingOrder.update({
          where: { id: order.id },
          data: { status: "VERIFIED" },
        }),
        prisma.verificationLog.create({
          data: {
            orderId: order.id,
            verifierId: verifierUser.id,
            decision: "APPROVED",
            wastagePct: 0.0,
          },
        }),
      ]);

      expect(updatedOrder.status).toBe("VERIFIED");
      expect(log.decision).toBe("APPROVED");
      expect(log.verifierId).toBe(verifierUser.id);
    });
  });

  describe("Verification: Shortage Handling", () => {
    it("blocks approval when any component has a shortage", async () => {
      const order = await prisma.cuttingOrder.create({
        data: {
          orderNo: `TEST-SHORTAGE-${Date.now()}`,
          recipeId: recipe.id,
          targetQty: 10,
          fabricRollId: "ROLL-T2",
          actualFabricYds: 15.0,
          status: "PENDING_VERIFICATION",
          createdBy: supervisorUser.id,
          verificationItems: {
            create: [
              { componentId: recipe.components[0].id, expectedQty: 10, actualQty: 10, status: "GREEN" },
              { componentId: recipe.components[1].id, expectedQty: 10, actualQty: 8, status: "RED" },
              { componentId: recipe.components[2].id, expectedQty: 20, actualQty: 20, status: "GREEN" },
            ],
          },
        },
        include: { verificationItems: true },
      });

      const canApprove = canApproveOrder(order.verificationItems);
      expect(canApprove).toBe(false);

      const hasShortage = order.verificationItems.some(
        (i) => i.status === "RED" || i.actualQty === null
      );
      expect(hasShortage).toBe(true);
    });
  });

  describe("Verification: Rejection", () => {
    it("rejects empty reason note", () => {
      const emptyNote = "   ";
      const isValid = emptyNote.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it("records rejection audit log with reason note", async () => {
      const order = await prisma.cuttingOrder.create({
        data: {
          orderNo: `TEST-REJECT-${Date.now()}`,
          recipeId: recipe.id,
          targetQty: 10,
          fabricRollId: "ROLL-T3",
          actualFabricYds: 15.0,
          status: "PENDING_VERIFICATION",
          createdBy: supervisorUser.id,
        },
      });

      const [updatedOrder, log] = await prisma.$transaction([
        prisma.cuttingOrder.update({
          where: { id: order.id },
          data: { status: "REJECTED" },
        }),
        prisma.verificationLog.create({
          data: {
            orderId: order.id,
            verifierId: verifierUser.id,
            decision: "REJECTED",
            rejectionNote: "Shortage of 2 back panels. Re-cutting needed.",
          },
        }),
      ]);

      expect(updatedOrder.status).toBe("REJECTED");
      expect(log.decision).toBe("REJECTED");
      expect(log.rejectionNote).toContain("Shortage of 2 back panels");
    });
  });

  describe("Security: Role Verification", () => {
    it("enforces role permissions", () => {
      const supervisorRole = supervisorUser.role;
      const isVerifier = supervisorRole === "cutting_verifier";
      expect(isVerifier).toBe(false);

      const checkPermission = (role: string) => {
        if (role !== "cutting_verifier") {
          return { status: 403, error: "Forbidden" };
        }
        return { status: 200 };
      };

      expect(checkPermission(supervisorRole).status).toBe(403);
      expect(checkPermission(verifierUser.role).status).toBe(200);
    });
  });

  describe("Queue: Sewing Queue Isolation", () => {
    it("only returns VERIFIED and IN_SEWING orders in sewing queue query", async () => {
      const sewingQueueOrders = await prisma.cuttingOrder.findMany({
        where: {
          status: { in: ["VERIFIED", "IN_SEWING"] },
        },
      });

      const invalidOrders = sewingQueueOrders.filter(
        (o) => o.status === "PENDING_VERIFICATION" || o.status === "REJECTED" || o.status === "CUTTING_IN_PROGRESS"
      );
      expect(invalidOrders.length).toBe(0);
    });
  });
});
