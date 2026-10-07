import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const rejectSchema = z.object({
  rejectionNote: z.string().min(1, "Rejection note is required").trim(),
});

// POST /api/orders/[id]/reject — reject with mandatory reason note
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "cutting_verifier") {
    return NextResponse.json(
      { error: "Forbidden: Only cutting verifiers can reject orders" },
      { status: 403 }
    );
  }

  const { id } = await params;

  const body = await req.json();
  const parsed = rejectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Rejection note is required", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const order = await db.cuttingOrder.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (order.status !== "PENDING_VERIFICATION") {
    return NextResponse.json({ error: "Order is not pending verification" }, { status: 400 });
  }

  const [updatedOrder, log] = await db.$transaction([
    db.cuttingOrder.update({
      where: { id },
      data: { status: "REJECTED" },
    }),
    db.verificationLog.create({
      data: {
        orderId: id,
        verifierId: session.user.id!,
        decision: "REJECTED",
        rejectionNote: parsed.data.rejectionNote,
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    order: updatedOrder,
    log,
    message: "Batch rejected and returned to supervisor for re-cutting",
  });
}
