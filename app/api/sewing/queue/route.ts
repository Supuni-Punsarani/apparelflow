import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/sewing/queue — VERIFIED orders only (sewing_supervisor)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "sewing_supervisor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Query isolation: ALWAYS enforce WHERE status = 'VERIFIED' at DB level
  // Never trust URL params for this filter
  const orders = await db.cuttingOrder.findMany({
    where: {
      status: "VERIFIED", // HARDCODED — never read from request
    },
    include: {
      recipe: true,
      creator: { select: { fullName: true } },
      verificationItems: { include: { component: true } },
      verificationLogs: {
        where: { decision: "APPROVED" },
        include: { verifier: { select: { fullName: true, email: true } } },
        orderBy: { timestamp: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(orders);
}
