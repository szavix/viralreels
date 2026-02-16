import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@viralreels/shared";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Create a Supabase client for use in Next.js Server Components / Route Handlers.
 * Must pass cookies() from next/headers.
 */
export function createServerSupabaseClient(cookieStore: {
  get: (name: string) => { name: string; value: string } | undefined;
  set: (name: string, value: string, options: CookieOptions) => void;
  delete: (name: string, options: CookieOptions) => void;
}) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // set() can fail in Server Components (read-only)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.delete(name, options);
          } catch {
            // delete() can fail in Server Components (read-only)
          }
        },
      },
    }
  );
}

/**
 * Create a Supabase admin client using the service role key.
 * Use this ONLY in server-side code (API routes, cron jobs).
 * Bypasses RLS policies.
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
