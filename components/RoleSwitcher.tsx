"use client";

import { useSession, signIn } from "next-auth/react";
import { useState } from "react";
import { Shield, Scissors, CheckCircle, Shirt, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

const ROLES = [
  {
    key: "cutting_supervisor",
    label: "Cutting Supervisor",
    email: "supervisor@apparelflow.com",
    password: "supervisor123",
    icon: Scissors,
    activeBg: "bg-blue-600 text-white",
    hoverBg: "hover:bg-blue-50 text-blue-800 border-blue-300",
    description: "Create orders & view supervisor logs",
    route: "/supervisor",
  },
  {
    key: "cutting_verifier",
    label: "Cutting Verifier (QC)",
    email: "verifier@apparelflow.com",
    password: "verifier123",
    icon: CheckCircle,
    activeBg: "bg-purple-600 text-white",
    hoverBg: "hover:bg-purple-50 text-purple-800 border-purple-300",
    description: "Verification terminal: traffic-light count & sign-off",
    route: "/verifier",
  },
  {
    key: "sewing_supervisor",
    label: "Sewing Supervisor",
    email: "sewing@apparelflow.com",
    password: "sewing123",
    icon: Shirt,
    activeBg: "bg-emerald-600 text-white",
    hoverBg: "hover:bg-emerald-50 text-emerald-800 border-emerald-300",
    description: "Sewing queue (verified batches)",
    route: "/sewing",
  },
];

export default function RoleSwitcher() {
  const { data: session } = useSession();
  const [switching, setSwitching] = useState(false);
  const router = useRouter();

  if (!session) return null;

  const currentRole = (session.user as any)?.role;

  async function handleSwitch(roleObj: typeof ROLES[0]) {
    if (currentRole === roleObj.key || switching) return;
    setSwitching(true);
    try {
      const res = await signIn("credentials", {
        email: roleObj.email,
        password: roleObj.password,
        redirect: false,
      });
      if (res?.ok) {
        router.push(roleObj.route);
        router.refresh();
      }
    } catch (err) {
      console.error("Role switch error:", err);
    } finally {
      setSwitching(false);
    }
  }

  return (
    <aside aria-label="Role Switcher" className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold tracking-wide uppercase text-slate-300">
            Active Role:
          </span>
          <span className="font-bold text-indigo-300 bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
            {(session.user as any)?.fullName || session.user?.name} ({currentRole})
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-medium">Switch Role:</span>
          {ROLES.map((r) => {
            const Icon = r.icon;
            const isCurrent = currentRole === r.key;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => handleSwitch(r)}
                disabled={switching || isCurrent}
                title={r.description}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all border ${
                  isCurrent
                    ? `${r.activeBg} border-transparent shadow-sm ring-1 ring-white/20`
                    : `bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white`
                } ${switching ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{r.label}</span>
                {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse ml-0.5" />}
              </button>
            );
          })}
          {switching && (
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin ml-1" />
          )}
        </div>
      </div>
    </aside>
  );
}
