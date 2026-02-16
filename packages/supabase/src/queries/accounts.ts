import type { SupabaseClient } from "@supabase/supabase-js";
import type { Account, AccountInsert } from "@viralreels/shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

/**
 * Fetch all accounts, sorted by username.
 */
export async function fetchAccounts(client: Client) {
  const { data, error } = await client
    .from("accounts")
    .select("*")
    .order("username", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Account[];
}

/**
 * Fetch only active accounts (used by the scraper).
 */
export async function fetchActiveAccounts(client: Client) {
  const { data, error } = await client
    .from("accounts")
    .select("*")
    .eq("active", true)
    .order("username", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Account[];
}

/**
 * Fetch a single account by ID.
 */
export async function fetchAccountById(client: Client, id: string) {
  const { data, error } = await client
    .from("accounts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Account;
}

/**
 * Create a new account to track.
 */
export async function createAccount(client: Client, account: AccountInsert) {
  const { data, error } = await client
    .from("accounts")
    .insert(account)
    .select()
    .single();

  if (error) throw error;
  return data as Account;
}

/**
 * Toggle the active status of an account.
 */
export async function toggleAccountActive(client: Client, id: string, active: boolean) {
  const { data, error } = await client
    .from("accounts")
    .update({ active })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Account;
}

/**
 * Update account profile metadata after scraping.
 */
export async function updateAccountProfile(
  client: Client,
  id: string,
  profile: {
    full_name?: string;
    profile_pic_url?: string;
    follower_count?: number;
    biography?: string;
    last_scraped_at?: string;
  }
) {
  const { data, error } = await client
    .from("accounts")
    .update(profile)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Account;
}

/**
 * Delete an account by ID.
 */
export async function deleteAccount(client: Client, id: string) {
  const { error } = await client
    .from("accounts")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
