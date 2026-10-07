"use client";

import { useState } from "react";
import {
  Shirt,
  CheckCircle2,
  Clock,
  Play,
  UserCheck,
  Percent,
  Layers,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface SewingOrder {
  id: string;
  orderNo: string;
  targetQty: number;
  fabricRollId: string;
  actualFabricYds: number;
  status: string;
  createdAt: any;
  updatedAt: any;
  creator: {
    fullName: string;
  };
  recipe: {
    name: string;
    recipeCode: string;
    category: string;
    stdFabricYards: number;
    wastageCap: number;
  };
  verificationItems: {
    id: string;
    expectedQty: number;
    actualQty: number | null;
    status: string | null;
    component: {
      componentName: string;
      piecesPerGarment: number;
    };
  }[];
  verificationLogs: {
    id: string;
    decision: string;
    wastagePct: number | null;
    timestamp: any;
    verifier: {
      fullName: string;
      email: string;
    };
  }[];
}

export default function SewingQueueClient({
  initialOrders,
}: {
  initialOrders: SewingOrder[];
}) {
  const router = useRouter();
  const [orders, setOrders] = useState<SewingOrder[]>(initialOrders);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  async function handleStartAssembly(orderId: string) {
    setStartingId(orderId);
    setMessage("");

    try {
      const res = await fetch(`/api/sewing/${orderId}/start`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start assembly");
      }

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "IN_SEWING" } : o))
      );
      setMessage(`✅ Order moved to active assembly line!`);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to start assembly.");
    } finally {
      setStartingId(null);
    }
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-3">
          <Shirt className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-gray-900">No Verified Batches in Queue</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-2">
          Batches will only appear here once 100% verified by the Cutting QC Verifier.
        </p>
        <p className="text-xs text-gray-400">
          (Use the top Role Switcher to switch to Verifier, count pieces, and approve a batch)
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-xl flex items-center gap-2 text-sm font-bold">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {orders.map((order) => {
          const auditLog = order.verificationLogs[0];
          const isAssemblyStarted = order.status === "IN_SEWING";
          const expectedFabric = order.targetQty * order.recipe.stdFabricYards;

          return (
            <div
              key={order.id}
              className={`bg-white rounded-2xl border ${
                isAssemblyStarted
                  ? "border-blue-300 ring-2 ring-blue-50"
                  : "border-emerald-200"
              } p-6 shadow-sm flex flex-col justify-between space-y-5`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {order.orderNo}
                      </span>
                      {isAssemblyStarted ? (
                        <span className="text-[11px] font-bold text-blue-800 bg-blue-100 border border-blue-300 px-2.5 py-0.5 rounded-full">
                          In Active Sewing
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                          Verified & Ready
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mt-1">{order.recipe.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">{order.recipe.recipeCode} • {order.recipe.category}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-gray-500 block font-medium">Batch Size</span>
                    <span className="text-xl font-black text-gray-900">{order.targetQty} units</span>
                  </div>
                </div>

                {/* Immutable QC Digital Stamp */}
                <div className="my-4 bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-emerald-900">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-emerald-700" />
                      Digital QC Stamp (Verified)
                    </span>
                    <span className="font-mono text-[11px]">
                      {auditLog ? new Date(auditLog.timestamp).toLocaleTimeString() : ""}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-700 text-xs">
                    <span>Verified By:</span>
                    <span className="font-bold text-gray-900">{auditLog?.verifier?.fullName || "QC Officer"}</span>
                  </div>
                  <div className="flex justify-between text-gray-700 text-xs">
                    <span>Fabric Wastage Rate:</span>
                    <span className="font-mono font-bold text-emerald-800">
                      {auditLog?.wastagePct !== null ? `${auditLog?.wastagePct}%` : "0.0%"}
                      <span className="text-gray-500 font-normal ml-1">(Cap: +{order.recipe.wastageCap}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-700 text-xs">
                    <span>Fabric Used / Expected:</span>
                    <span className="font-mono text-gray-900">
                      {order.actualFabricYds} yds / {expectedFabric.toFixed(1)} yds
                    </span>
                  </div>
                </div>

                {/* Verified Piece Counts */}
                <div>
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-gray-500" /> Verified Cut Components:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {order.verificationItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 flex items-center justify-between"
                      >
                        <span className="font-medium text-gray-800 truncate mr-2">
                          {item.component.componentName}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-bold text-gray-900">{item.actualQty} pcs</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-gray-100 flex justify-end">
                {isAssemblyStarted ? (
                  <div className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-4 py-2.5 rounded-xl flex items-center gap-2">
                    <Play className="w-4 h-4 text-blue-600 fill-current" />
                    <span>Assembly Line Running</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartAssembly(order.id)}
                    disabled={startingId === order.id}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{startingId === order.id ? "Starting Assembly..." : "Start Sewing Assembly"}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
