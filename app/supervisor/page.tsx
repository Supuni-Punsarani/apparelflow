import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { PackagePlus, Scissors, Clock, CheckCircle2, XCircle, AlertTriangle, Layers } from "lucide-react";
import { statusBadgeClass, statusLabel } from "@/lib/utils";

export default async function SupervisorPage() {
  const session = await auth();
  if (!session) redirect("/");

  const role = (session.user as any)?.role;
  if (role !== "cutting_supervisor") redirect("/dashboard");

  const orders = await db.cuttingOrder.findMany({
    include: {
      recipe: { include: { components: true } },
      creator: { select: { fullName: true } },
      verificationItems: { include: { component: true } },
      verificationLogs: {
        include: { verifier: { select: { fullName: true } } },
        orderBy: { timestamp: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalOrders = orders.length;
  const pendingCount = orders.filter((o) => o.status === "PENDING_VERIFICATION").length;
  const verifiedCount = orders.filter((o) => o.status === "VERIFIED" || o.status === "IN_SEWING").length;
  const rejectedCount = orders.filter((o) => o.status === "REJECTED").length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2.5">
              <Scissors className="w-8 h-8 text-blue-600" />
              Cutting Department Dashboard
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage cutting production batches, log fabric yardage, and track QC status.
            </p>
          </div>

          <Link
            href="/supervisor/create"
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-colors text-sm"
          >
            <PackagePlus className="w-5 h-5" />
            <span>Create Cutting Batch</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Batches</span>
              <Layers className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-2xl font-black text-gray-900 mt-2">{totalOrders}</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-yellow-200 shadow-xs bg-yellow-50/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-yellow-800 uppercase tracking-wider">Pending QC</span>
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="text-2xl font-black text-yellow-900 mt-2">{pendingCount}</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-green-200 shadow-xs bg-green-50/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-green-800 uppercase tracking-wider">Verified Passed</span>
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-black text-green-900 mt-2">{verifiedCount}</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-red-200 shadow-xs bg-red-50/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-800 uppercase tracking-wider">Rejected (Shortage)</span>
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-2xl font-black text-red-900 mt-2">{rejectedCount}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Cutting Production Orders</h2>
              <p className="text-xs text-gray-500 mt-0.5">Active batches in cutting and quality verification</p>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-3">
                <Scissors className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900">No cutting orders yet</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1 mb-4">
                Get started by creating your first production batch from garment recipes.
              </p>
              <Link
                href="/supervisor/create"
                className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg text-sm"
              >
                <PackagePlus className="w-4 h-4" /> Create First Batch
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Order No</th>
                    <th className="py-3.5 px-6">Garment Recipe</th>
                    <th className="py-3.5 px-6">Target Qty</th>
                    <th className="py-3.5 px-6">Fabric Roll ID</th>
                    <th className="py-3.5 px-6">Fabric Used (Yds)</th>
                    <th className="py-3.5 px-6">QC Status</th>
                    <th className="py-3.5 px-6">Audit / QC Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {orders.map((order) => {
                    const latestLog = order.verificationLogs[0];
                    const isRejected = order.status === "REJECTED";
                    const isVerified = order.status === "VERIFIED" || order.status === "IN_SEWING";

                    return (
                      <tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-indigo-700 text-xs">
                          {order.orderNo}
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-semibold text-gray-900">{order.recipe.name}</div>
                          <div className="text-xs text-gray-500">{order.recipe.recipeCode} ({order.recipe.category})</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded font-bold text-gray-900 bg-gray-100 text-xs">
                            {order.targetQty} units
                          </span>
                        </td>
                        <td className="py-4 px-6 font-mono text-xs text-gray-700 font-medium">
                          {order.fabricRollId}
                        </td>
                        <td className="py-4 px-6 text-gray-700 font-medium">
                          {order.actualFabricYds} yds
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${statusBadgeClass(order.status)}`}>
                            {statusLabel(order.status)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {isRejected && latestLog?.rejectionNote && (
                            <div className="bg-red-50 border border-red-200 text-red-800 p-2.5 rounded-lg text-xs max-w-xs">
                              <div className="font-bold flex items-center gap-1 text-red-900">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                                Rejected by {latestLog.verifier?.fullName}:
                              </div>
                              <div className="mt-0.5 italic">"{latestLog.rejectionNote}"</div>
                            </div>
                          )}

                          {isVerified && latestLog && (
                            <div className="text-xs text-green-800 bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-lg max-w-xs">
                              <span className="font-semibold">Approved by {latestLog.verifier?.fullName}</span>
                              {latestLog.wastagePct !== null && (
                                <span className="block text-[11px] text-green-700 font-mono">
                                  Wastage: {latestLog.wastagePct}%
                                </span>
                              )}
                            </div>
                          )}

                          {order.status === "PENDING_VERIFICATION" && (
                            <span className="text-xs text-yellow-700 flex items-center gap-1 font-medium">
                              <Clock className="w-3.5 h-3.5" /> Awaiting QC Count
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
