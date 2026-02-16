import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/auth";
import { toggleAccountActive, deleteAccount } from "@viralreels/supabase";

/**
 * PATCH /api/accounts/[id]
 *
 * Toggle account active status. Body: { active: boolean }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { client, error } = await getAuthenticatedClient();
  if (error) return error;

  try {
    const body = await request.json();
    const { active } = body;

    if (typeof active !== "boolean") {
      return NextResponse.json(
        { error: "active must be a boolean" },
        { status: 400 }
      );
    }

    const account = await toggleAccountActive(client!, params.id, active);
    return NextResponse.json(account);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to update account", message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/accounts/[id]
 *
 * Delete an account by ID.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { client, error } = await getAuthenticatedClient();
  if (error) return error;

  try {
    await deleteAccount(client!, params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to delete account", message },
      { status: 500 }
    );
  }
}
