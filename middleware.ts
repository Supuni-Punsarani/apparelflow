import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // Public paths
  if (pathname === "/" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Require auth for all other routes
  if (!session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const role = (session.user as any).role;

  // Role-based path guards
  if (pathname.startsWith("/supervisor") && role !== "cutting_supervisor") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (pathname.startsWith("/verifier") && role !== "cutting_verifier") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (pathname.startsWith("/sewing") && role !== "sewing_supervisor") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
