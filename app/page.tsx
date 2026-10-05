"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const DEMO_ACCOUNTS = [
  {
    role: "Cutting Supervisor",
    email: "supervisor@apparelflow.com",
    password: "supervisor123",
    color: "bg-blue-600 hover:bg-blue-700",
    textColor: "text-blue-700",
    border: "border-blue-200 bg-blue-50",
    description: "Create orders, set quantities, log fabric",
  },
  {
    role: "Cutting Verifier",
    email: "verifier@apparelflow.com",
    password: "verifier123",
    color: "bg-purple-600 hover:bg-purple-700",
    textColor: "text-purple-700",
    border: "border-purple-200 bg-purple-50",
    description: "Count parts, trigger traffic lights, approve/reject",
  },
  {
    role: "Sewing Supervisor",
    email: "sewing@apparelflow.com",
    password: "sewing123",
    color: "bg-green-600 hover:bg-green-700",
    textColor: "text-green-700",
    border: "border-green-200 bg-green-50",
    description: "View verified batches, start assembly",
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
    } else {
      router.push("/dashboard");
    }
  }

  async function handleAccountLogin(email: string, password: string) {
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Login failed. Please check credentials.");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">AF</span>
            </div>
            <h1 className="text-3xl font-bold text-white">ApparelFlow ERP</h1>
          </div>
          <p className="text-slate-400">Cutting Operations & Verification Terminal</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign In</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@apparelflow.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Quick Access Accounts</h2>
            <p className="text-sm text-gray-500 mb-4">Select a persona to sign in directly</p>
            <div className="space-y-3">
              {DEMO_ACCOUNTS.map((acc) => (
                <div key={acc.role} className={`border rounded-xl p-3 ${acc.border}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${acc.textColor}`}>{acc.role}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{acc.description}</p>
                      <p className="text-xs text-gray-500 mt-1 font-mono">{acc.email}</p>
                    </div>
                    <button
                      onClick={() => handleAccountLogin(acc.email, acc.password)}
                      disabled={loading}
                      className={`${acc.color} disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer`}
                    >
                      Login
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          ApparelFlow ERP &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
