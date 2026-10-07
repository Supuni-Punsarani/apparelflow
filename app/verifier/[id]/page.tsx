"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Info,
  ShieldAlert,
  Send,
  Lock,
} from "lucide-react";
import { getItemStatus, itemStatusClass } from "@/lib/utils";

interface VerificationItem {
  id: string;
  componentId: string;
  expectedQty: number;
  actualQty: number | null;
  status: string | null;
  component: {
    id: string;
    componentName: string;
    piecesPerGarment: number;
    imageUrl?: string | null;
  };
}

interface OrderDetail {
  id: string;
  orderNo: string;
  targetQty: number;
  fabricRollId: string;
  actualFabricYds: number;
  status: string;
  createdAt: string;
  creator: {
    fullName: string;
    email: string;
  };
  recipe: {
    name: string;
    recipeCode: string;
    category: string;
    stdFabricYards: number;
    wastageCap: number;
  };
  verificationItems: VerificationItem[];
}

export default function VerificationTerminalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [counts, setCounts] = useState<Record<string, number | "">>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");
  const [rejectError, setRejectError] = useState("");

  useEffect(() => {
    async function loadOrder() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) throw new Error("Order not found or access denied.");
        const data: OrderDetail = await res.json();
        setOrder(data);

        // Initialize counts from existing item data
        const initialCounts: Record<string, number | ""> = {};
        data.verificationItems.forEach((item) => {
          initialCounts[item.componentId] = item.actualQty !== null ? item.actualQty : "";
        });
        setCounts(initialCounts);
      } catch (err: any) {
        setError(err.message || "Failed to load order details.");
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">Loading Gatekeeper Terminal...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="max-w-xl mx-auto py-12 px-4 text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900">Order Not Found</h2>
          <p className="text-sm text-gray-600 mt-1 mb-4">{error || "Could not retrieve order details."}</p>
          <Link href="/verifier" className="text-purple-600 font-bold text-sm hover:underline">
            ← Return to QC Queue
          </Link>
        </div>
      </div>
    );
  }

  // Real-time evaluation of each item based on current counts state
  const evaluatedItems = order.verificationItems.map((item) => {
    const rawVal = counts[item.componentId];
    const isEntered = typeof rawVal === "number" && rawVal >= 0;
    const actual = isEntered ? rawVal : null;
    const status = actual !== null ? getItemStatus(actual, item.expectedQty) : null;
    const diff = actual !== null ? actual - item.expectedQty : null;

    return {
      ...item,
      currentActual: actual,
      currentStatus: status,
      diff,
    };
  });

  const allItemsEntered = evaluatedItems.every((item) => item.currentActual !== null);
  const redItems = evaluatedItems.filter((item) => item.currentStatus === "RED");
  const yellowItems = evaluatedItems.filter((item) => item.currentStatus === "YELLOW");
  const greenItems = evaluatedItems.filter((item) => item.currentStatus === "GREEN");
  const hasShortage = redItems.length > 0;
  const canApprove = allItemsEntered && !hasShortage;

  function handleCountChange(componentId: string, valStr: string) {
    if (valStr === "") {
      setCounts((prev) => ({ ...prev, [componentId]: "" }));
      return;
    }
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setCounts((prev) => ({ ...prev, [componentId]: parsed }));
    }
  }

  function handleAutoFillExpected() {
    if (!order) return;
    const filled: Record<string, number | ""> = {};
    order.verificationItems.forEach((item) => {
      filled[item.componentId] = item.expectedQty;
    });
    setCounts(filled);
  }

  function handleSimulateShortage() {
    if (!order) return;
    const filled: Record<string, number | ""> = {};
    order.verificationItems.forEach((item, index) => {
      // Create shortage on first component
      filled[item.componentId] = index === 0 ? Math.max(0, item.expectedQty - 5) : item.expectedQty;
    });
    setCounts(filled);
  }

  async function handleApprove() {
    if (!canApprove || submitting) return;

    setError("");
    setSubmitting(true);

    try {
      // 1. Submit the component counts
      const countsPayload: Record<string, number> = {};
      evaluatedItems.forEach((item) => {
        if (item.currentActual !== null) {
          countsPayload[item.componentId] = item.currentActual;
        }
      });

      const verifyRes = await fetch(`/api/orders/${orderId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counts: countsPayload }),
      });

      if (!verifyRes.ok) {
        const d = await verifyRes.json();
        throw new Error(d.error || "Failed to record component counts.");
      }

      // 2. Submit approval to Gatekeeper hard stop endpoint
      const approveRes = await fetch(`/api/orders/${orderId}/approve`, {
        method: "POST",
      });

      const approveData = await approveRes.json();

      if (!approveRes.ok) {
        throw new Error(approveData.error || "Gatekeeper rejected approval.");
      }

      setSuccessMessage("✅ Batch verified & digitally signed! Released to Sewing Queue.");
      setTimeout(() => {
        router.push("/verifier");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "An error occurred during verification.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectionNote.trim()) {
      setRejectError("Rejection note is required explaining what needs re-cutting.");
      return;
    }

    setSubmitting(true);
    setRejectError("");

    try {
      // 1. First record whatever counts were logged
      const countsPayload: Record<string, number> = {};
      evaluatedItems.forEach((item) => {
        if (item.currentActual !== null) {
          countsPayload[item.componentId] = item.currentActual;
        }
      });

      if (Object.keys(countsPayload).length > 0) {
        await fetch(`/api/orders/${orderId}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ counts: countsPayload }),
        });
      }

      // 2. Submit rejection with mandatory reason
      const res = await fetch(`/api/orders/${orderId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionNote: rejectionNote.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reject batch.");
      }

      setShowRejectModal(false);
      setSuccessMessage("⚠️ Batch rejected and returned to Cutting Supervisor with audit note.");
      setTimeout(() => {
        router.push("/verifier");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setRejectError(err.message || "Failed to process rejection.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <Link
              href="/verifier"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to QC Queue
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2.5">
              <ShieldCheck className="w-7 h-7 text-purple-600" />
              Gatekeeper Verification Terminal
            </h1>
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              Order No: <span className="font-bold text-indigo-700">{order.orderNo}</span> • Roll: {order.fabricRollId}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-500 mr-1">Count Presets:</span>
            <button
              type="button"
              onClick={handleAutoFillExpected}
              className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-800 border border-green-300 rounded-lg text-xs font-bold cursor-pointer transition-colors"
            >
              Set All to Target
            </button>
            <button
              type="button"
              onClick={handleSimulateShortage}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 rounded-lg text-xs font-bold cursor-pointer transition-colors"
            >
              Simulate Shortage
            </button>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-300 text-red-900 p-4 rounded-xl flex items-start gap-3 text-sm">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Gatekeeper Server Hard Stop Triggered</p>
              <p className="text-xs text-red-800 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-300 text-green-900 p-4 rounded-xl flex items-start gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div className="font-bold">{successMessage}</div>
          </div>
        )}

        {/* Batch Summary Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-gray-500 font-medium block">Garment Recipe</span>
            <span className="text-sm font-bold text-gray-900">{order.recipe.name}</span>
            <span className="text-gray-400 block font-mono">{order.recipe.recipeCode} ({order.recipe.category})</span>
          </div>
          <div>
            <span className="text-gray-500 font-medium block">Target Batch Qty</span>
            <span className="text-sm font-bold text-gray-900">{order.targetQty} units</span>
            <span className="text-gray-400 block">Cut by {order.creator.fullName}</span>
          </div>
          <div>
            <span className="text-gray-500 font-medium block">Fabric Consumption</span>
            <span className="text-sm font-bold text-gray-900">{order.actualFabricYds} yds cut</span>
            <span className="text-gray-400 block">Std: {(order.targetQty * order.recipe.stdFabricYards).toFixed(1)} yds</span>
          </div>
          <div>
            <span className="text-gray-500 font-medium block">Live QC Status</span>
            {hasShortage ? (
              <span className="inline-flex items-center gap-1 font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-300 mt-0.5">
                <XCircle className="w-3.5 h-3.5" /> DEFECT SHORTAGE (HARD STOP)
              </span>
            ) : allItemsEntered ? (
              <span className="inline-flex items-center gap-1 font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded border border-green-300 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> PASSED QC
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded border border-yellow-300 mt-0.5">
                <Clock className="w-3.5 h-3.5" /> COUNTING IN PROGRESS
              </span>
            )}
          </div>
        </div>

        {/* Component Verification Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" /> Component Piece Count Matrix
              </h2>
              <p className="text-xs text-gray-500">
                Count physical parts in bundle. Every component is evaluated against expected bill-of-materials quantity.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1 text-green-700">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Match
              </span>
              <span className="flex items-center gap-1 text-yellow-700">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> Excess
              </span>
              <span className="flex items-center gap-1 text-red-700">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Shortage (Blocks)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100/70 border-b border-gray-200 text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <th className="py-3 px-6">Cut Part / Component</th>
                  <th className="py-3 px-6">Pieces / Garment</th>
                  <th className="py-3 px-6">Expected Count</th>
                  <th className="py-3 px-6">Actual Physical Count</th>
                  <th className="py-3 px-6">Traffic Light QC Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {evaluatedItems.map((item) => {
                  const val = counts[item.componentId];
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        item.currentStatus === "RED"
                          ? "bg-red-50/40"
                          : item.currentStatus === "GREEN"
                          ? "bg-green-50/20"
                          : item.currentStatus === "YELLOW"
                          ? "bg-yellow-50/20"
                          : ""
                      }`}
                    >
                      <td className="py-4 px-6">
                        <div className="font-bold text-gray-900">{item.component.componentName}</div>
                        <div className="text-xs text-gray-400">Component ID: {item.componentId.slice(-6)}</div>
                      </td>
                      <td className="py-4 px-6 text-gray-700 font-medium">
                        {item.component.piecesPerGarment} pcs / garment
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-900 font-bold rounded-lg text-xs">
                          {item.expectedQty} pcs
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="max-w-[160px]">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Count..."
                            value={val}
                            onChange={(e) => handleCountChange(item.componentId, e.target.value)}
                            className="w-full px-3 py-2 text-sm font-bold text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-xs placeholder:text-gray-400"
                          />
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {item.currentStatus === "GREEN" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                            GREEN (MATCH)
                          </span>
                        )}
                        {item.currentStatus === "YELLOW" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-300">
                            <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />
                            YELLOW (+{item.diff} EXCESS)
                          </span>
                        )}
                        {item.currentStatus === "RED" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                            RED ({item.diff} SHORTAGE - DEFECT)
                          </span>
                        )}
                        {item.currentStatus === null && (
                          <span className="text-xs text-gray-400 italic">Enter physical count</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gatekeeper Decision Bar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              Gatekeeper Hard Stop Enforcement Rule
            </div>
            <p className="text-xs text-gray-600 max-w-xl">
              {hasShortage ? (
                <span className="text-red-700 font-semibold">
                  ⚠️ HARD STOP ACTIVE: Batch has component shortage(s). "Approve Batch" is physically disabled on the client and rejected with HTTP 422 on the API. Batch must be rejected with reason.
                </span>
              ) : !allItemsEntered ? (
                <span className="text-yellow-700">
                  Please count and enter physical pieces for all components before digital sign-off.
                </span>
              ) : (
                <span className="text-green-700 font-semibold">
                  ✅ All components verified! Digital sign-off will write immutable audit trail and release batch to Sewing Floor.
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Reject Button (Always available to return defective batch to supervisor) */}
            <button
              type="button"
              onClick={() => {
                setRejectError("");
                setShowRejectModal(true);
              }}
              disabled={submitting}
              className="px-5 py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4 text-red-600" />
              <span>Reject Batch (Return to Cutting)</span>
            </button>

            {/* Approve Button (Strictly blocked if shortage exists) */}
            <button
              type="button"
              onClick={handleApprove}
              disabled={!canApprove || submitting}
              title={
                !canApprove
                  ? "Approval blocked: components have shortages (RED) or are uncounted"
                  : "Sign and release batch"
              }
              className={`px-6 py-3 font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2 ${
                canApprove
                  ? "bg-purple-600 hover:bg-purple-700 text-white cursor-pointer shadow-purple-200"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300"
              }`}
            >
              {!canApprove ? <Lock className="w-4 h-4 text-gray-400" /> : <CheckCircle2 className="w-4 h-4 text-white" />}
              <span>{submitting ? "Processing Sign-off..." : "Approve & Release to Sewing"}</span>
            </button>
          </div>
        </div>

        {/* Rejection Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Reject Batch #{order.orderNo}</h3>
                  <p className="text-xs text-gray-500">Provide a mandatory reason note for the Cutting Supervisor</p>
                </div>
              </div>

              {rejectError && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-xs font-semibold">
                  {rejectError}
                </div>
              )}

              <form onSubmit={handleRejectSubmit} className="space-y-4">
                <div>
                  <label htmlFor="rejectionNote" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Rejection Reason / Defect Details *
                  </label>
                  <textarea
                    id="rejectionNote"
                    rows={4}
                    required
                    placeholder="e.g. 5 Front Body Panels short due to fabric defect on roll. Re-cutting required before assembly."
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(false)}
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !rejectionNote.trim()}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-bold rounded-lg text-xs shadow transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? "Rejecting..." : "Confirm Rejection"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
