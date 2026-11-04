const projectUrl = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const SUPABASE_CONFIG = {
  projectUrl,
  publishableKey,
  anonKey: publishableKey,
  projectRef: projectUrl ? new URL(projectUrl).hostname.split(".")[0] : undefined,
};

export { supabase } from "./lib/supabase";
