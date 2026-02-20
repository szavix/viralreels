import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/auth";
import { fetchFavoriteReels, addFavorite } from "@viralreels/supabase";

/**
 * GET /api/favorites
 *
 * List current user's favorited reels.
 * Query params: page, pageSize
 */
export async function GET(request: NextRequest) {
  const { client, user, error } = await getAuthenticatedClient(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "24", 10);

  try {
    const favorites = await fetchFavoriteReels(client!, user!.id, { page, pageSize });
    return NextResponse.json(favorites);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to fetch favorites", message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/favorites
 *
 * Favorite a reel. Body: { reelId: string }
 */
export async function POST(request: NextRequest) {
  const { client, user, error } = await getAuthenticatedClient(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { reelId } = body;

    if (!reelId || typeof reelId !== "string") {
      return NextResponse.json(
        { error: "reelId is required and must be a string" },
        { status: 400 }
      );
    }

    const favorite = await addFavorite(client!, user!.id, reelId);
    return NextResponse.json(favorite, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to favorite reel", message },
      { status: 500 }
    );
  }
}
