import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { CheckCircle, AlertCircle, Clock, ShieldCheck, ArrowRight, Layers } from "lucide-react";
import { statusBadgeClass, statusLabel } from "@/lib/utils";

export default async function VerifierQueuePage() {
  const session = await auth();
  if (!session) redirect("/");

  const role = (session.user as any)?.role;
  if (role !== "cutting_verifier") redirect("/dashboard");

  // Fetch orders in PENDING_VERIFICATION (or all orders for verifier QC overview)
  const pendingOrders = await db.cuttingOrder.findMany({
    where: { status: "PENDING_VERIFICATION" },
    include: {
      recipe: { include: { components: true } },
      creator: { select: { fullName: true } },
      verificationItems: { include: { component: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const recentAuditedOrders = await db.cuttingOrder.findMany({
    where: {
      status: { in: ["VERIFIED", "REJECTED", "IN_SEWING"] },
    },
    include: {
      recipe: true,
      verificationLogs: {
        include: { verifier: { select: { fullName: true } } },
        orderBy: { timestamp: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              QC Gatekeeper Terminal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2 flex items-center gap-2.5">
            <ShieldCheck className="w-8 h-8 text-purple-600" />
            Cutting Verification Checkpoint
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Perform component-by-component physical piece count audits. Shortage batches (RED) are strictly blocked from the sewing queue.
          </p>
        </div>

        {/* Pending Orders Queue */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-10">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                Batches Awaiting Verification ({pendingOrders.length})
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Click "Open QC Terminal" to count parts and sign off or reject
              </p>
            </div>
          </div>

          {pendingOrders.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 mx-auto flex items-center justify-center mb-3">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900">QC Queue is Clear!</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
                No cutting batches currently require inspection. Switch to Cutting Supervisor to dispatch a new batch.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {pendingOrders.map((order) => {
                const totalExpectedParts = order.verificationItems.reduce(
                  (sum, item) => sum + item.expectedQty,
                  0
                );
                return (
                  <div
                    key={order.id}
                    className="border border-purple-100 bg-purple-50/20 rounded-xl p-5 hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {order.orderNo}
                        </span>
                        <span className="text-[11px] font-bold text-yellow-800 bg-yellow-100 border border-yellow-300 px-2 py-0.5 rounded-full">
                          Pending QC
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-gray-900">{order.recipe.name}</h3>
                      <p className="text-xs text-gray-500 mb-3 font-mono">{order.recipe.recipeCode} • {order.recipe.category}</p>

                      <div className="space-y-1.5 text-xs bg-white p-3 rounded-lg border border-gray-200 mb-4">
                        <div className="flex justify-between text-gray-700">
                          <span>Target Quantity:</span>
                          <span className="font-bold text-gray-900">{order.targetQty} units</span>
                        </div>
                        <div className="flex justify-between text-gray-700">
                          <span>Fabric Roll ID:</span>
                          <span className="font-mono font-semibold text-gray-900">{order.fabricRollId}</span>
                        </div>
                        <div className="flex justify-between text-gray-700">
                          <span>Cut Parts to Verify:</span>
                          <span className="font-bold text-purple-700">{order.verificationItems.length} components ({totalExpectedParts} pcs)</span>
                        </div>
                        <div className="flex justify-between text-gray-700">
                          <span>Cut by Supervisor:</span>
                          <span className="font-medium text-gray-900">{order.creator?.fullName}</span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/verifier/${order.id}`}
                      className="w-full inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                    >
                      <span>Open QC Terminal</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recently Audited Batches */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-base font-bold text-gray-900">Recent Verification Audit History</h2>
            <p className="text-xs text-gray-500 mt-0.5">Immutable audit logs recorded by the server</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-6">Order No</th>
                  <th className="py-3 px-6">Garment</th>
                  <th className="py-3 px-6">Target Qty</th>
                  <th className="py-3 px-6">Audit Decision</th>
                  <th className="py-3 px-6">Audited By</th>
                  <th className="py-3 px-6">Timestamp & Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentAuditedOrders.map((ord) => {
                  const log = ord.verificationLogs[0];
                  return (
                    <tr key={ord.id} className="hover:bg-gray-50/70">
                      <td className="py-3.5 px-6 font-mono font-bold text-xs text-indigo-700">{ord.orderNo}</td>
                      <td className="py-3.5 px-6 font-semibold text-gray-900">{ord.recipe.name}</td>
                      <td className="py-3.5 px-6 text-gray-700">{ord.targetQty} units</td>
                      <td className="py-3.5 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusBadgeClass(ord.status)}`}>
                          {statusLabel(ord.status)}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-medium text-gray-900">{log?.verifier?.fullName || "QC Staff"}</td>
                      <td className="py-3.5 px-6 text-xs text-gray-500">
                        <div>{log ? new Date(log.timestamp).toLocaleString() : "-"}</div>
                        {log?.rejectionNote && (
                          <div className="text-red-700 italic mt-0.5 font-medium">"{log.rejectionNote}"</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
