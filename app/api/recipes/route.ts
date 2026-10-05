import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/recipes
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const recipes = await db.recipe.findMany({
    include: { components: { orderBy: { componentName: "asc" } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(recipes);
}
