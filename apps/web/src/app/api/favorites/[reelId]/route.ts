import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/auth";
import {
  fetchFavoriteStatus,
  updateFavoriteCompleted,
  removeFavorite,
} from "@viralreels/supabase";

/**
 * GET /api/favorites/[reelId]
 *
 * Get favorite/completed status for one reel.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { reelId: string } }
) {
  const { client, user, error } = await getAuthenticatedClient(request);
  if (error) return error;

  try {
    const status = await fetchFavoriteStatus(client!, user!.id, params.reelId);
    return NextResponse.json(status);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to fetch favorite status", message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/favorites/[reelId]
 *
 * Update completion status. Body: { completed: boolean }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { reelId: string } }
) {
  const { client, user, error } = await getAuthenticatedClient(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { completed } = body;

    if (typeof completed !== "boolean") {
      return NextResponse.json(
        { error: "completed must be a boolean" },
        { status: 400 }
      );
    }

    const favorite = await updateFavoriteCompleted(
      client!,
      user!.id,
      params.reelId,
      completed
    );
    return NextResponse.json(favorite);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to update favorite completion", message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/favorites/[reelId]
 *
 * Unfavorite a reel.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { reelId: string } }
) {
  const { client, user, error } = await getAuthenticatedClient(request);
  if (error) return error;

  try {
    await removeFavorite(client!, user!.id, params.reelId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to unfavorite reel", message },
      { status: 500 }
    );
  }
}
