import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/auth";
import {
  fetchAccountCategoryLinks,
  replaceAccountCategories,
} from "@viralreels/supabase";

/**
 * GET /api/accounts/[id]/categories
 *
 * List category IDs currently assigned to an account.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { client, error } = await getAuthenticatedClient(request);
  if (error) return error;

  try {
    const links = await fetchAccountCategoryLinks(client!, params.id);
    return NextResponse.json({
      accountId: params.id,
      categoryIds: links.map((link) => link.category_id),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to fetch account categories", message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/accounts/[id]/categories
 *
 * Replace all category assignments for an account. Body: { categoryIds: string[] }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { client, error } = await getAuthenticatedClient(request);
  if (error) return error;

  try {
    const body = await request.json();
    const categoryIdsRaw = body?.categoryIds;

    if (!Array.isArray(categoryIdsRaw)) {
      return NextResponse.json(
        { error: "categoryIds must be an array" },
        { status: 400 }
      );
    }

    const categoryIds = [...new Set(
      categoryIdsRaw
        .filter((value) => typeof value === "string")
        .map((value: string) => value.trim())
        .filter(Boolean)
    )];

    await replaceAccountCategories(client!, params.id, categoryIds);
    return NextResponse.json({ accountId: params.id, categoryIds });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to update account categories", message },
      { status: 500 }
    );
  }
}
