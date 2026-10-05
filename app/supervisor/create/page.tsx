"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { ArrowLeft, PackagePlus, Layers, Calculator, AlertCircle, CheckCircle2, Scissors, Info } from "lucide-react";

interface RecipeComponent {
  id: string;
  componentName: string;
  piecesPerGarment: number;
}

interface Recipe {
  id: string;
  recipeCode: string;
  name: string;
  category: string;
  stdFabricYards: number;
  wastageCap: number;
  components: RecipeComponent[];
}

export default function CreateOrderPage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [targetQty, setTargetQty] = useState<number | "">("");
  const [fabricRollId, setFabricRollId] = useState<string>("");
  const [actualFabricYds, setActualFabricYds] = useState<number | "">("");
  const [loading, setLoading] = useState<boolean>(false);
  const [fetching, setFetching] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function fetchRecipes() {
      try {
        const res = await fetch("/api/recipes");
        if (res.ok) {
          const data = await res.json();
          setRecipes(data);
          if (data.length > 0) {
            setSelectedRecipeId(data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load recipes", err);
      } finally {
        setFetching(false);
      }
    }
    fetchRecipes();
  }, []);

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId);
  const parsedQty = typeof targetQty === "number" && targetQty > 0 ? targetQty : 0;
  const parsedYards = typeof actualFabricYds === "number" && actualFabricYds > 0 ? actualFabricYds : 0;

  // Expected Fabric calculation
  const expectedFabricYards = selectedRecipe ? parsedQty * selectedRecipe.stdFabricYards : 0;
  const estimatedWastage =
    expectedFabricYards > 0 && parsedYards > 0
      ? (((parsedYards - expectedFabricYards) / expectedFabricYards) * 100).toFixed(1)
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!selectedRecipeId) {
      setError("Please select a garment recipe.");
      return;
    }
    if (!parsedQty || parsedQty <= 0) {
      setError("Target batch quantity must be a positive integer.");
      return;
    }
    if (!fabricRollId.trim()) {
      setError("Fabric Roll ID is required (e.g., FAB-ROLL-882).");
      return;
    }
    if (!parsedYards || parsedYards <= 0) {
      setError("Actual fabric used in yards must be greater than 0.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId: selectedRecipeId,
          targetQty: parsedQty,
          fabricRollId: fabricRollId.trim(),
          actualFabricYds: parsedYards,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create cutting order.");
      }

      router.push("/supervisor");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/supervisor"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Orders
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2.5">
            <PackagePlus className="w-7 h-7 text-blue-600" />
            Create Cutting Production Batch
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Dispatch raw cut bundles to the Gatekeeper Terminal for component verification.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Validation Error</p>
              <p className="text-xs text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
              <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-blue-600" /> Batch Specifications
              </h2>

              {/* Recipe Selector */}
              <div>
                <label htmlFor="recipe" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Garment Recipe (Bill of Materials) *
                </label>
                {fetching ? (
                  <div className="animate-pulse h-10 bg-gray-100 rounded-lg" />
                ) : (
                  <select
                    id="recipe"
                    value={selectedRecipeId}
                    onChange={(e) => setSelectedRecipeId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
                  >
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.recipeCode}) — {r.category} • Std {r.stdFabricYards} yds/unit
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Target Batch Quantity */}
              <div>
                <label htmlFor="targetQty" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Target Batch Quantity (Garments) *
                </label>
                <div className="relative">
                  <input
                    id="targetQty"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 50"
                    value={targetQty}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTargetQty(val === "" ? "" : Math.max(1, parseInt(val, 10) || 0));
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
                    required
                  />
                  <div className="absolute right-3.5 top-2.5 text-xs font-bold text-gray-400">units</div>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Derives expected pieces for every panel via dynamic component multiplier.
                </p>
              </div>

              {/* Fabric Roll ID & Actual Yards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fabricRoll" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Fabric Roll ID *
                  </label>
                  <input
                    id="fabricRoll"
                    type="text"
                    placeholder="e.g. FAB-ROLL-882"
                    value={fabricRollId}
                    onChange={(e) => setFabricRollId(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold font-mono text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="fabricYards" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Actual Fabric Cut (Yards) *
                  </label>
                  <input
                    id="fabricYards"
                    type="number"
                    min="0.1"
                    step="0.1"
                    placeholder="e.g. 92.5"
                    value={actualFabricYds}
                    onChange={(e) => {
                      const val = e.target.value;
                      setActualFabricYds(val === "" ? "" : parseFloat(val) || 0);
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || fetching}
              className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span>Dispatching Batch...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Submit Batch to QC Terminal</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Dynamic Multiplier Engine Preview */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-indigo-600" /> Multiplier Engine
                </h3>
                <span className="text-[11px] font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  Live Derived
                </span>
              </div>

              {selectedRecipe ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-gray-500">Selected Recipe</div>
                    <div className="text-sm font-bold text-gray-900">{selectedRecipe.name}</div>
                    <div className="text-xs text-gray-500 font-mono">{selectedRecipe.recipeCode}</div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Derived Cut Parts ({parsedQty} Garments):
                    </div>
                    <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                      {selectedRecipe.components.map((comp) => {
                        const expectedPieces = parsedQty * comp.piecesPerGarment;
                        return (
                          <div key={comp.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-200/60 last:border-none">
                            <span className="text-gray-700 font-medium">{comp.componentName}</span>
                            <div className="text-right">
                              <span className="font-bold text-gray-900">{expectedPieces} pcs</span>
                              <span className="text-[10px] text-gray-400 block">
                                ({comp.piecesPerGarment} / garment)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fabric Yield Estimate */}
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between text-blue-950 font-medium">
                      <span>Standard Fabric Consumption:</span>
                      <span className="font-bold">{expectedFabricYards.toFixed(1)} yds</span>
                    </div>
                    <div className="flex justify-between text-blue-950 font-medium">
                      <span>Wastage Threshold Cap:</span>
                      <span className="font-bold text-blue-700">+{selectedRecipe.wastageCap}%</span>
                    </div>
                    {estimatedWastage !== null && (
                      <div className="flex justify-between pt-1 border-t border-blue-200 font-bold text-blue-900">
                        <span>Estimated Batch Wastage:</span>
                        <span className={parseFloat(estimatedWastage) > selectedRecipe.wastageCap ? "text-red-600" : "text-emerald-700"}>
                          {estimatedWastage}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Select a recipe to view components</p>
              )}
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
