import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://nsotmdvalhcqrigepkcu.supabase.co";
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_pVHNpa7nCtSmfiEloxSC1g_IWw8iqXd";

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Missing Supabase project URL or publishable key in environment.");
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export default supabase;
