import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Singleton Supabase client instance
let supabaseInstance: SupabaseClient | null = null;

/**
 * Get the shared Supabase client instance
 * This prevents multiple GoTrueClient instances from being created
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey,
      {
        auth: {
          persistSession: false, // We handle auth manually
          autoRefreshToken: false,
        },
      }
    );
  }
  return supabaseInstance;
}
