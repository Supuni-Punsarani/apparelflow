"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import RoleSwitcher from "./RoleSwitcher";
import { LogOut, Scissors, CheckCircle, Shirt, PackagePlus } from "lucide-react";

const ROLE_CONFIG: Record<
  string,
  { label: string; color: string; links: { href: string; label: string; icon: any }[] }
> = {
  cutting_supervisor: {
    label: "Cutting Supervisor",
    color: "bg-blue-600 text-white",
    links: [
      { href: "/supervisor", label: "My Orders & Batches", icon: Scissors },
      { href: "/supervisor/create", label: "Create Cutting Batch", icon: PackagePlus },
    ],
  },
  cutting_verifier: {
    label: "Cutting Verifier (QC)",
    color: "bg-purple-600 text-white",
    links: [
      { href: "/verifier", label: "QC Verification Terminal", icon: CheckCircle },
    ],
  },
  sewing_supervisor: {
    label: "Sewing Supervisor",
    color: "bg-emerald-600 text-white",
    links: [
      { href: "/sewing", label: "Sewing Queue & Handover", icon: Shirt },
    ],
  },
};

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session) return null;

  const role = (session.user as any)?.role as string;
  const config = ROLE_CONFIG[role];
  const fullName = (session.user as any)?.fullName || session.user?.name;

  return (
    <>
      <RoleSwitcher />
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shadow group-hover:bg-indigo-700 transition-colors">
                  <span className="text-white font-black text-base tracking-tighter">AF</span>
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-base leading-none">ApparelFlow ERP</div>
                  <div className="text-[11px] text-gray-500 font-medium">Cutting & Verification Checkpoint</div>
                </div>
              </Link>

              {config && (
                <nav className="hidden md:flex items-center gap-1.5 ml-2">
                  {config.links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                          isActive
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs"
                            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-gray-500"}`} />
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              )}
            </div>

            <div className="flex items-center gap-3">
              {config && (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${config.color}`}>
                  {config.label}
                </span>
              )}

              <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block" />

              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-gray-900 leading-tight">{fullName}</div>
                  <div className="text-[11px] text-gray-500 font-mono">{session.user?.email}</div>
                </div>

                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-red-700 bg-gray-50 hover:bg-red-50 border border-gray-300 hover:border-red-300 px-3 py-2 rounded-lg transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
