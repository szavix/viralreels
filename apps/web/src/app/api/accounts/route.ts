import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/auth";
import { fetchAccounts, createAccount } from "@viralreels/supabase";

/**
 * GET /api/accounts
 *
 * List all tracked accounts.
 */
export async function GET() {
  const { client, error } = await getAuthenticatedClient();
  if (error) return error;

  try {
    const accounts = await fetchAccounts(client!);
    return NextResponse.json(accounts);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to fetch accounts", message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounts
 *
 * Create a new account to track. Body: { username: string }
 */
export async function POST(request: NextRequest) {
  const { client, error } = await getAuthenticatedClient();
  if (error) return error;

  try {
    const body = await request.json();
    const { username } = body;

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "username is required and must be a string" },
        { status: 400 }
      );
    }

    // Normalize: remove @ prefix, lowercase, trim
    const normalized = username.replace(/^@/, "").toLowerCase().trim();

    if (normalized.length === 0) {
      return NextResponse.json(
        { error: "username cannot be empty" },
        { status: 400 }
      );
    }

    const account = await createAccount(client!, {
      username: normalized,
      active: true,
      full_name: null,
      profile_pic_url: null,
      follower_count: null,
      biography: null,
      last_scraped_at: null,
    });

    return NextResponse.json(account, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isDuplicate = message.includes("duplicate") || message.includes("unique");

    return NextResponse.json(
      {
        error: isDuplicate
          ? "This account is already being tracked"
          : "Failed to add account",
        message,
      },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}
