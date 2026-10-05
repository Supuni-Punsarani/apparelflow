import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateOrderNo(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

export function getItemStatus(actual: number, expected: number): "GREEN" | "YELLOW" | "RED" {
  if (actual === expected) return "GREEN";
  if (actual > expected) return "YELLOW";
  return "RED";
}

export function canApproveOrder(
  items: Array<{ actualQty: number | null; status: string | null }>
): boolean {
  return items.every((item) => item.actualQty !== null && item.status !== "RED");
}

export function computeWastagePct(actualYards: number, targetQty: number, stdFabricYards: number): number {
  const expectedFabric = targetQty * stdFabricYards;
  return ((actualYards - expectedFabric) / expectedFabric) * 100;
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "CUTTING_IN_PROGRESS":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "PENDING_VERIFICATION":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "VERIFIED":
      return "bg-green-100 text-green-800 border-green-200";
    case "REJECTED":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "CUTTING_IN_PROGRESS": return "Cutting In Progress";
    case "PENDING_VERIFICATION": return "Pending Verification";
    case "VERIFIED": return "Verified";
    case "REJECTED": return "Rejected";
    default: return status;
  }
}

export function itemStatusClass(status: string | null): string {
  switch (status) {
    case "GREEN": return "bg-green-100 text-green-800 border-green-300";
    case "YELLOW": return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "RED": return "bg-red-100 text-red-800 border-red-300";
    default: return "bg-gray-100 text-gray-600 border-gray-200";
  }
}
