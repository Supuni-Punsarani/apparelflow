import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { generateOrderNo } from "@/lib/utils";

const createOrderSchema = z.object({
  recipeId: z.string().min(1, "Recipe is required"),
  targetQty: z.number().int().positive("Target quantity must be a positive integer"),
  fabricRollId: z.string().min(1, "Fabric Roll ID is required"),
  actualFabricYds: z.number().positive("Actual fabric yards must be positive"),
});

// GET /api/orders — list orders (role-filtered)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = session.user.id;

  let where: any = {};

  if (role === "cutting_supervisor") {
    // Supervisors see their own orders
    where = { createdBy: userId };
  } else if (role === "cutting_verifier") {
    // Verifiers see orders pending verification
    where = { status: "PENDING_VERIFICATION" };
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orders = await db.cuttingOrder.findMany({
    where,
    include: {
      recipe: true,
      creator: { select: { fullName: true, email: true } },
      verificationItems: { include: { component: true } },
      verificationLogs: { include: { verifier: { select: { fullName: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}

// POST /api/orders — create new cutting order (supervisor only)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "cutting_supervisor") {
    return NextResponse.json({ error: "Forbidden: Only cutting supervisors can create orders" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { recipeId, targetQty, fabricRollId, actualFabricYds } = parsed.data;

  // Verify recipe exists and get components
  const recipe = await db.recipe.findUnique({
    where: { id: recipeId },
    include: { components: true },
  });

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  if (targetQty <= 0) {
    return NextResponse.json({ error: "Target quantity must be greater than 0" }, { status: 400 });
  }

  // Create order + verification items (multiplier engine)
  const order = await db.cuttingOrder.create({
    data: {
      orderNo: generateOrderNo(),
      recipeId,
      targetQty,
      fabricRollId: fabricRollId.trim(),
      actualFabricYds,
      status: "PENDING_VERIFICATION",
      createdBy: session.user.id!,
      verificationItems: {
        create: recipe.components.map((component) => ({
          componentId: component.id,
          expectedQty: component.piecesPerGarment * targetQty,
          actualQty: null,
          status: null,
        })),
      },
    },
    include: {
      recipe: true,
      verificationItems: { include: { component: true } },
    },
  });

  return NextResponse.json(order, { status: 201 });
}
