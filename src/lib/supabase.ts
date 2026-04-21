/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

/**
 * Lazy-initialized Supabase client.
 * This prevents the app from crashing on startup if the environment variables are missing.
 * The error will only be thrown when the client is first accessed.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop, receiver) {
    if (!_supabase) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
          'Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the Secrets panel.'
        );
      }
      _supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    return Reflect.get(_supabase, prop, receiver);
  },
});
