// =============================================================
// Supabase Client & Configuration
// Project URL: https://glpoowzygushtxwqmcxl.supabase.co
// Project Ref: glpoowzygushtxwqmcxl
// =============================================================

export const SUPABASE_CONFIG = {
  projectUrl: import.meta.env.VITE_SUPABASE_URL || "https://glpoowzygushtxwqmcxl.supabase.co",
  publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_MAXkviTqJHRkDOTjKnUTYw_mj0q8Mtp",
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdscG9vd3p5Z3VzaHR4d3FtY3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNTU1NjcsImV4cCI6MjEwNTkzMTU2N30.Q6MjOaTU95EGjb1ngr4tnB6RniwAmQIfWDNRlTyePeM",
  projectRef: "glpoowzygushtxwqmcxl",
  directDbUrl: "postgresql://postgres:[YOUR-PASSWORD]@db.glpoowzygushtxwqmcxl.supabase.co:5432/postgres",
};

export { supabase } from "./lib/supabase";
