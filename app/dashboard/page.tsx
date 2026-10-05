import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/");

  const role = (session.user as any).role;

  if (role === "cutting_supervisor") redirect("/supervisor");
  if (role === "cutting_verifier") redirect("/verifier");
  if (role === "sewing_supervisor") redirect("/sewing");

  redirect("/");
}
