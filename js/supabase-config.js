/* ============================================================
   Supabase connection — fill in your project's credentials

   Where to find them: Supabase dashboard → your project →
   Project Settings (gear icon) → API.
     - projectUrl : "Project URL"        e.g. https://xxxxxxxx.supabase.co
     - anonKey    : "anon" / "publishable" key (long string starting "eyJ...")

   Never paste the "service_role" key here — that one bypasses all
   security and must never appear in client-side code. The anon key
   is the one designed to ship in the browser; Row Level Security
   (set up by supabase-schema.sql) is what keeps it safe.

   Leave both empty ("") and the app keeps working exactly as before,
   using localStorage — nothing breaks while you're setting this up.
   ============================================================ */

window.GUBCC_SUPABASE_CONFIG = {
  projectUrl: "https://new-lkpm8iotw-mfhneo-5177s-projects.vercel.app/",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVweWVmYWp1ZWV4cmVvaG9vc3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MjQyNjksImV4cCI6MjEwMzIwMDI2OX0.PKwGz3xgh5hw5aEh_vb1226GfwaK--RihPYhUnG3riI"
  
};
