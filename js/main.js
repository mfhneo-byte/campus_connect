/* ============================================================
   GUB Campus Connect — shared UI helpers (all pages)
   ============================================================ */

var MANAGE_KEY = "gubcc_manage";
var ADMIN_KEY = "gubcc_admin_unlocked";

/* Escape user-supplied text before inserting it into HTML */
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* 2026-07-16 -> "16 Jul 2026" */
function fmtDate(iso) {
  var m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var p = String(iso || "").split("-");
  if (p.length !== 3) { return iso || ""; }
  return parseInt(p[2], 10) + " " + m[(parseInt(p[1], 10) || 1) - 1] + " " + p[0];
}

/* "16:50" -> "4:50 PM" */
function fmtTime(hhmm) {
  var p = String(hhmm || "").split(":");
  if (p.length < 2) { return hhmm || ""; }
  var h = parseInt(p[0], 10);
  var suffix = h >= 12 ? "PM" : "AM";
  var h12 = h % 12; if (h12 === 0) { h12 = 12; }
  return h12 + ":" + p[1] + " " + suffix;
}

function todayISO() {
  var d = new Date();
  var mm = String(d.getMonth() + 1); if (mm.length < 2) { mm = "0" + mm; }
  var dd = String(d.getDate()); if (dd.length < 2) { dd = "0" + dd; }
  return d.getFullYear() + "-" + mm + "-" + dd;
}

/* ---------- toast notifications ---------- */
function toast(msg, isError, isLive) {
  var zone = document.getElementById("toast-zone");
  if (!zone) {
    zone = document.createElement("div");
    zone.id = "toast-zone";
    document.body.appendChild(zone);
  }
  var t = document.createElement("div");
  t.className = "toast" + (isError ? " err" : "") + (isLive ? " live" : "");
  if (isLive) {
    var dot = document.createElement("span");
    dot.className = "live-dot";
    t.appendChild(dot);
  }
  var text = document.createElement("span");
  text.textContent = msg;
  t.appendChild(text);
  zone.appendChild(t);
  setTimeout(function () {
    t.style.opacity = "0";
    t.style.transition = "opacity 0.3s ease";
    setTimeout(function () { if (t.parentNode) { t.parentNode.removeChild(t); } }, 320);
  }, isLive ? 4200 : 2600);
}

/* ---------- modal helpers ---------- */
function openModal(id) {
  var el = document.getElementById(id);
  if (el) {
    el.classList.add("open");
    var firstInput = el.querySelector("input, select, textarea");
    if (firstInput) { firstInput.focus(); }
  }
}
function closeModal(id) {
  var el = document.getElementById(id);
  if (el) { el.classList.remove("open"); }
}

/* ---------- manage mode (hidden until this browser is unlocked) + footer reset ---------- */
document.addEventListener("DOMContentLoaded", function () {
  // Admin unlock is per-browser, not part of the page link. Visiting once with
  // ?admin=1 remembers this browser (via localStorage) and reveals Manage mode on
  // every page from then on; ?admin=0 forgets it again. Either way the query
  // string is stripped from the address bar immediately after, so it can never
  // end up in a URL you copy and share with someone else.
  var pendingToast = null;
  try {
    var params = new URLSearchParams(location.search);
    if (params.has("admin")) {
      if (params.get("admin") === "1") {
        localStorage.setItem(ADMIN_KEY, "1");
        pendingToast = "Manage mode unlocked in this browser.";
      } else {
        localStorage.removeItem(ADMIN_KEY);
        localStorage.setItem(MANAGE_KEY, "0");
        pendingToast = "Manage mode locked — this browser now shows the public view.";
      }
      history.replaceState(null, "", location.pathname);
    }
  } catch (e) { /* ignore */ }

  var unlocked = false;
  try { unlocked = localStorage.getItem(ADMIN_KEY) === "1"; } catch (e) { /* ignore */ }

  var toggle = document.getElementById("manage-toggle");

  if (unlocked) {
    document.body.classList.add("admin-unlocked");
    var saved = null;
    try { saved = localStorage.getItem(MANAGE_KEY); } catch (e) { /* ignore */ }
    if (saved === "1") {
      document.body.classList.add("manage-on");
      if (toggle) { toggle.checked = true; }
    }
    if (toggle) {
      toggle.addEventListener("change", function () {
        document.body.classList.toggle("manage-on", toggle.checked);
        try { localStorage.setItem(MANAGE_KEY, toggle.checked ? "1" : "0"); } catch (e) { /* ignore */ }
        toast(toggle.checked ? "Manage mode on — add and delete controls are visible."
                             : "Manage mode off.");
      });
    }
  } else {
    // Belt-and-braces: even a stale "manage on" flag from before can't reveal
    // admin-only content in a browser that isn't unlocked.
    document.body.classList.remove("admin-unlocked", "manage-on");
  }

  if (pendingToast) { toast(pendingToast); }

  // Reset demo data (footer)
  var reset = document.getElementById("reset-data");
  if (reset) {
    reset.addEventListener("click", function () {
      if (confirm("Reset all demo data back to the original seed records?")) {
        dbReset();
        location.reload();
      }
    });
  }

  // Close any modal on backdrop click or Escape
  var backdrops = document.querySelectorAll(".modal-backdrop");
  for (var i = 0; i < backdrops.length; i++) {
    (function (bd) {
      bd.addEventListener("click", function (ev) {
        if (ev.target === bd) { bd.classList.remove("open"); }
      });
    })(backdrops[i]);
  }
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") {
      var open = document.querySelectorAll(".modal-backdrop.open");
      for (var j = 0; j < open.length; j++) { open[j].classList.remove("open"); }
    }
  });

  // Footer year
  var yr = document.getElementById("year");
  if (yr) { yr.textContent = String(new Date().getFullYear()); }

  // Live cross-tab announcements (new notice/event/activity/club published
  // elsewhere). Page-specific scripts separately re-render their own data;
  // this one just surfaces the banner, on every page, regardless of module.
  onSync(function (announce) {
    if (announce && announce.message) { toast(announce.message, false, true); }
  });
});
