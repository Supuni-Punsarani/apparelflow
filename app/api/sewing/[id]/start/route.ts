import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/sewing/[id]/start — Transition verified batch to IN_SEWING
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (role !== "sewing_supervisor") {
    return NextResponse.json({ error: "Forbidden: Only sewing supervisor can start assembly" }, { status: 403 });
  }

  const { id } = await params;

  const order = await db.cuttingOrder.findUnique({
    where: { id },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (order.status !== "VERIFIED") {
    return NextResponse.json(
      { error: "Only verified orders can begin sewing assembly" },
      { status: 400 }
    );
  }

  const updated = await db.cuttingOrder.update({
    where: { id },
    data: { status: "IN_SEWING" },
  });

  return NextResponse.json({
    success: true,
    order: updated,
    message: "Batch moved to active sewing line assembly",
  });
}
