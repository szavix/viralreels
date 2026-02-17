import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/auth";
import { deleteCategory } from "@viralreels/supabase";

/**
 * DELETE /api/categories/[id]
 *
 * Delete a category by ID.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { client, error } = await getAuthenticatedClient(request);
  if (error) return error;

  try {
    await deleteCategory(client!, params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to delete category", message },
      { status: 500 }
    );
  }
}
