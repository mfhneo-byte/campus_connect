/* ============================================================
   Supabase connection bootstrap

   This file only establishes the connection (loads the SDK, creates
   a client). It does NOT yet change how data is read or written —
   that's the bigger migration (data.js's localStorage calls becoming
   real queries) that comes after the connection itself is confirmed
   working. Until that migration happens, the rest of the app keeps
   using localStorage exactly as before; this file is purely additive.

   Gotcha this avoids: the CDN script exposes a global called
   `supabase` (the SDK namespace, with `.createClient` on it). Naming
   your own client instance the same thing overwrites that namespace
   and breaks everything after it. So the SDK namespace stays
   `supabase`, and the connected client is deliberately called
   `sbClient` everywhere in this project.
   ============================================================ */

var sbClient = supabase.createClient(
    "https://hwhijhzsburajhcdejjb.supabase.co",
    "sb_publishable_BwSWuRmgc1ua9N5i5rZvbw_LwtmPvMd"
);;
var sbReady = null; // Promise, resolves once connected (or stays unresolved if not configured)

function isSupabaseConfigured() {
  var cfg = window.GUBCC_SUPABASE_CONFIG || {};
  return !!(cfg.projectUrl && cfg.anonKey);
}

function initSupabase() {
  if (!isSupabaseConfigured()) { return; }
  var cfg = window.GUBCC_SUPABASE_CONFIG;

  sbReady = new Promise(function (resolve, reject) {
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    s.onload = function () {
      try {
        // `supabase` here is the SDK namespace the CDN script just
        // created on window — do not reassign that name.
        sbClient = supabase.createClient(cfg.projectUrl, cfg.anonKey);
        resolve(sbClient);
      } catch (e) { reject(e); }
    };
    s.onerror = function () { reject(new Error("Supabase SDK failed to load")); };
    document.head.appendChild(s);
  });
}

/* Small on-page confirmation so you can SEE the connection worked,
   without needing to open DevTools. Safe to remove once you trust it.
   Queries the real `routes` table, which doubles as a check that
   supabase-schema.sql has actually been run, not just that the
   network path and credentials are correct. */
function showSupabaseStatus() {
  if (!isSupabaseConfigured()) {
    console.info("[Supabase] Not configured yet — running on localStorage. Fill in js/supabase-config.js to connect.");
    return;
  }
  if (!sbReady) { return; }
  sbReady
    .then(function (client) {
      return client.from("routes").select("*", { count: "exact", head: true });
    })
    .then(function (res) {
      if (res.error) { throw res.error; }
      console.info("[Supabase] Connected. Found " + res.count + " row(s) in routes.");
      toast("✅ Connected to Supabase — found " + res.count + " route(s).", false, true);
    })
    .catch(function (err) {
      var msg = (err && err.message) || String(err);
      if (msg.indexOf("Failed to fetch") !== -1) {
        console.warn("[Supabase] Could not reach the project — check the Project URL.", err);
        toast("⚠️ Could not reach Supabase — check the Project URL in supabase-config.js.", true);
      } else if (/relation .* does not exist|not find the table/i.test(msg)) {
        console.warn("[Supabase] Connected, but the routes table doesn't exist yet.", err);
        toast("⚠️ Connected, but no routes table found — run supabase-schema.sql first.", true);
      } else if (/invalid api key|jwt/i.test(msg)) {
        console.warn("[Supabase] Connected, but the anon key was rejected.", err);
        toast("⚠️ Supabase rejected the anon key — double-check it in supabase-config.js.", true);
      } else {
        console.warn("[Supabase] Unexpected error while checking the connection.", err);
        toast("⚠️ Supabase error: " + msg, true);
      }
    });
}

document.addEventListener("DOMContentLoaded", function () {
  initSupabase();
  showSupabaseStatus();
});
