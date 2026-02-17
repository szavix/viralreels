import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/auth";
import { fetchCategories, createCategory } from "@viralreels/supabase";

/**
 * GET /api/categories
 *
 * List all categories.
 */
export async function GET(request: NextRequest) {
  const { client, error } = await getAuthenticatedClient(request);
  if (error) return error;

  try {
    const categories = await fetchCategories(client!);
    return NextResponse.json(categories);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to fetch categories", message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories
 *
 * Create a category. Body: { name: string }
 */
export async function POST(request: NextRequest) {
  const { client, error } = await getAuthenticatedClient(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "name is required and must be a string" },
        { status: 400 }
      );
    }

    const normalized = name.trim().toLowerCase();
    if (normalized.length === 0) {
      return NextResponse.json(
        { error: "name cannot be empty" },
        { status: 400 }
      );
    }

    const category = await createCategory(client!, normalized);
    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isDuplicate = message.includes("duplicate") || message.includes("unique");
    return NextResponse.json(
      {
        error: isDuplicate
          ? "This category already exists"
          : "Failed to create category",
        message,
      },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}
