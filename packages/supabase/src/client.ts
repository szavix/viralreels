import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@viralreels/shared";

/**
 * Create a Supabase client for use in browser/client components.
 * Reads env vars from the Next.js public runtime.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
