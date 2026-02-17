import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/auth";
import { fetchReels, type FetchReelsOptions } from "@viralreels/supabase";
import { REEL_SORT_OPTIONS, type FilterOption, type ReelSortOption } from "@viralreels/shared";

/**
 * GET /api/reels
 *
 * Fetch reels with pagination and filters.
 * Query params: filter, accountId, categoryIds, sortBy, page, pageSize, search
 */
export async function GET(request: NextRequest) {
  const { client, error } = await getAuthenticatedClient(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);

  const categoryIdsFromCsv = (searchParams.get("categoryIds") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const categoryIdsFromRepeated = searchParams.getAll("categoryId").map((value) => value.trim()).filter(Boolean);
  const categoryIds = [...new Set([...categoryIdsFromCsv, ...categoryIdsFromRepeated])];

  const sortByRaw = (searchParams.get("sortBy") ?? "virality") as ReelSortOption;
  const sortBy: ReelSortOption = sortByRaw in REEL_SORT_OPTIONS ? sortByRaw : "virality";

  const options: FetchReelsOptions = {
    filter: (searchParams.get("filter") as FilterOption) ?? "all",
    accountId: searchParams.get("accountId") ?? undefined,
    categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
    sortBy,
    page: parseInt(searchParams.get("page") ?? "1", 10),
    pageSize: parseInt(searchParams.get("pageSize") ?? "24", 10),
    search: searchParams.get("search") ?? undefined,
  };

  try {
    const result = await fetchReels(client!, options);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to fetch reels", message },
      { status: 500 }
    );
  }
}
