import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeWastagePct } from "@/lib/utils";

// POST /api/orders/[id]/approve — SERVER-SIDE HARD STOP GATEKEEPER
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RBAC: Only cutting_verifier can approve
  const role = (session.user as any).role;
  if (role !== "cutting_verifier") {
    return NextResponse.json(
      { error: "Forbidden: Only cutting verifiers can approve orders" },
      { status: 403 }
    );
  }

  const { id } = await params;

  const order = await db.cuttingOrder.findUnique({
    where: { id },
    include: {
      recipe: true,
      verificationItems: { include: { component: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (order.status !== "PENDING_VERIFICATION") {
    return NextResponse.json(
      { error: "Order is not in PENDING_VERIFICATION status" },
      { status: 400 }
    );
  }

  // HARD STOP: Check for any RED items or uncounted items
  const hasShortage = order.verificationItems.some(
    (item) => item.status === "RED" || item.actualQty === null
  );

  if (hasShortage) {
    return NextResponse.json(
      {
        error: "Approval blocked: One or more components have a shortage (RED) or are uncounted. Re-cutting required.",
        code: "HARD_STOP_SHORTAGE",
      },
      { status: 422 }
    );
  }

  // All items GREEN or YELLOW — compute wastage
  const wastagePct = computeWastagePct(
    order.actualFabricYds,
    order.targetQty,
    order.recipe.stdFabricYards
  );

  // Atomically: update order status + write immutable audit log
  const [updatedOrder, log] = await db.$transaction([
    db.cuttingOrder.update({
      where: { id },
      data: { status: "VERIFIED" },
    }),
    db.verificationLog.create({
      data: {
        orderId: id,
        // Verifier identity derived from SERVER session — never trusted from client
        verifierId: session.user.id!,
        decision: "APPROVED",
        wastagePct: parseFloat(wastagePct.toFixed(2)),
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    order: updatedOrder,
    log,
    message: "Batch approved and released to Sewing Queue",
  });
}
