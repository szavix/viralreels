import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category, AccountCategory } from "@viralreels/shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

/**
 * Fetch all categories, sorted by name.
 */
export async function fetchCategories(client: Client) {
  const { data, error } = await client
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Category[];
}

/**
 * Create a category.
 */
export async function createCategory(client: Client, name: string) {
  const normalizedName = name.trim().toLowerCase();

  const { data, error } = await client
    .from("categories")
    .insert({ name: normalizedName })
    .select()
    .single();

  if (error) throw error;
  return data as Category;
}

/**
 * Delete a category by ID.
 */
export async function deleteCategory(client: Client, id: string) {
  const { error } = await client
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Fetch account-category links for a single account.
 */
export async function fetchAccountCategoryLinks(client: Client, accountId: string) {
  const { data, error } = await client
    .from("account_categories")
    .select("*")
    .eq("account_id", accountId);

  if (error) throw error;
  return (data ?? []) as AccountCategory[];
}

/**
 * Replace all category assignments for an account.
 */
export async function replaceAccountCategories(
  client: Client,
  accountId: string,
  categoryIds: string[]
) {
  const { error: deleteError } = await client
    .from("account_categories")
    .delete()
    .eq("account_id", accountId);

  if (deleteError) throw deleteError;

  if (categoryIds.length === 0) return;

  const rows: AccountCategory[] = categoryIds.map((categoryId) => ({
    account_id: accountId,
    category_id: categoryId,
  }));

  const { error: insertError } = await client
    .from("account_categories")
    .insert(rows);

  if (insertError) throw insertError;
}
