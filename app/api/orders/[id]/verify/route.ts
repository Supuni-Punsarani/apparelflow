import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { getItemStatus } from "@/lib/utils";

const verifySchema = z.object({
  counts: z.record(z.string(), z.number().int().min(0, "Count must be 0 or greater")),
});

// POST /api/orders/[id]/verify — submit component counts (verifier only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "cutting_verifier") {
    return NextResponse.json({ error: "Forbidden: Only cutting verifiers can submit counts" }, { status: 403 });
  }

  const { id } = await params;

  const order = await db.cuttingOrder.findUnique({
    where: { id },
    include: { verificationItems: true },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "PENDING_VERIFICATION") {
    return NextResponse.json({ error: "Order is not pending verification" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { counts } = parsed.data;

  // Update each verification item
  const updates = order.verificationItems.map((item) => {
    const actual = counts[item.componentId];
    if (actual === undefined || actual === null) return null;
    const status = getItemStatus(actual, item.expectedQty);
    return db.verificationItem.update({
      where: { id: item.id },
      data: { actualQty: actual, status },
    });
  });

  await Promise.all(updates.filter(Boolean));

  // Fetch updated items
  const updatedItems = await db.verificationItem.findMany({
    where: { orderId: id },
    include: { component: true },
  });

  return NextResponse.json({ success: true, items: updatedItems });
}
