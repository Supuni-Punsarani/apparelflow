import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/orders/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const order = await db.cuttingOrder.findUnique({
    where: { id },
    include: {
      recipe: { include: { components: true } },
      creator: { select: { fullName: true, email: true } },
      verificationItems: {
        include: { component: true },
        orderBy: { component: { componentName: "asc" } },
      },
      verificationLogs: {
        include: { verifier: { select: { fullName: true, email: true } } },
        orderBy: { timestamp: "desc" },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  return NextResponse.json(order);
}
