import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/auth";
import { fetchReelById } from "@viralreels/supabase";

/**
 * GET /api/reels/[id]
 *
 * Fetch a single reel by its UUID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { client, error } = await getAuthenticatedClient();
  if (error) return error;

  try {
    const reel = await fetchReelById(client!, params.id);
    return NextResponse.json(reel);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Reel not found", message },
      { status: 404 }
    );
  }
}
