import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Shirt, CheckCircle2, AlertCircle, Play, Sparkles, UserCheck, Scissors } from "lucide-react";
import SewingQueueClient from "./SewingQueueClient";

export default async function SewingQueuePage() {
  const session = await auth();
  if (!session) redirect("/");

  const role = (session.user as any)?.role;
  if (role !== "sewing_supervisor") redirect("/dashboard");

  // Query Isolation: Strictly enforce WHERE status IN ['VERIFIED', 'IN_SEWING'] at database level
  const verifiedOrders = await db.cuttingOrder.findMany({
    where: {
      status: { in: ["VERIFIED", "IN_SEWING"] },
    },
    include: {
      recipe: { include: { components: true } },
      creator: { select: { fullName: true } },
      verificationItems: {
        include: { component: true },
        orderBy: { component: { componentName: "asc" } },
      },
      verificationLogs: {
        where: { decision: "APPROVED" },
        include: { verifier: { select: { fullName: true, email: true } } },
        orderBy: { timestamp: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Sewing Assembly Floor
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2 flex items-center gap-2.5">
            <Shirt className="w-8 h-8 text-emerald-600" />
            Verified Batches Sewing Queue
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Assembly line handover. Under factory SOP, only 100% verified, shortage-free batches are released to the sewing floor.
          </p>
        </div>

        <SewingQueueClient initialOrders={verifiedOrders} />
      </main>
    </div>
  );
}
