/* ============================================================
   GUB Campus Connect — Dashboard
   Shows the signed-in account's own applications & registrations
   (joined on studentId, since that's the key already shared by both).
   Re-renders live if data changes in another tab.
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {
  var db = dbLoad();

  function fmtJoined(iso) {
    var m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var p = String(iso || "").split("-");
    if (p.length !== 3) { return iso || "–"; }
    return m[(parseInt(p[1], 10) || 1) - 1] + " " + p[0];
  }

  function eventById(id) {
    for (var i = 0; i < db.events.length; i++) { if (db.events[i].id === id) { return db.events[i]; } }
    return null;
  }
  function clubById(id) {
    for (var i = 0; i < db.clubs.length; i++) { if (db.clubs[i].id === id) { return db.clubs[i]; } }
    return null;
  }

  function show(id, on) {
    var el = document.getElementById(id);
    if (el) { el.style.display = on ? "" : "none"; }
  }

  function render() {
    db = dbLoad();
    var user = currentUser();

    if (!user) {
      show("dash-guest", true);
      show("dash-user", false);
      show("dash-apps-section", false);
      show("dash-regs-section", false);
      return;
    }
    show("dash-guest", false);
    show("dash-user", true);
    show("dash-apps-section", true);
    show("dash-regs-section", true);

    document.getElementById("dash-welcome").textContent = "Welcome back, " + String(user.name).split(" ")[0];
    document.getElementById("dash-name").textContent = user.name;
    document.getElementById("dash-email").textContent = user.email;
    document.getElementById("dash-sid").textContent = user.studentId;
    document.getElementById("dash-mobile").textContent = user.mobile;

    var myApps = db.applications.filter(function (a) { return a.studentId === user.studentId; });
    var myRegs = db.registrations.filter(function (r) { return r.studentId === user.studentId; });

    document.getElementById("dash-stat-apps").textContent = myApps.length;
    document.getElementById("dash-stat-regs").textContent = myRegs.length;
    document.getElementById("dash-stat-joined").textContent = fmtJoined(user.joined);

    var appBody = document.getElementById("dash-app-body");
    if (myApps.length === 0) {
      appBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);">No applications yet — <a href="clubs.html">browse clubs</a> to apply.</td></tr>';
    } else {
      var h1 = "";
      for (var i = 0; i < myApps.length; i++) {
        var a = myApps[i], c = clubById(a.clubId);
        h1 +=
          "<tr><td class='mono'>" + esc(a.id) + "</td><td>" + esc(c ? c.name : a.clubId) + "</td>" +
          "<td class='mono'>" + esc(fmtDate(a.date)) + "</td><td><span class='badge gray'>" + esc(a.status) + "</span></td>" +
          "<td><button class='btn danger small' data-dash-del-app='" + esc(a.id) + "'>Withdraw</button></td></tr>";
      }
      appBody.innerHTML = h1;
    }

    var regBody = document.getElementById("dash-reg-body");
    if (myRegs.length === 0) {
      regBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);">No registrations yet — <a href="events.html">browse events</a> to register.</td></tr>';
    } else {
      var h2 = "";
      for (var j = 0; j < myRegs.length; j++) {
        var r = myRegs[j], e = eventById(r.eventId);
        h2 +=
          "<tr><td class='mono'>" + esc(r.id) + "</td><td>" + esc(e ? e.title : r.eventId) + "</td>" +
          "<td class='mono'>" + esc(e ? fmtDate(e.date) : "–") + "</td><td>" + esc(e ? e.venue : "–") + "</td>" +
          "<td><button class='btn danger small' data-dash-del-reg='" + esc(r.id) + "'>Cancel</button></td></tr>";
      }
      regBody.innerHTML = h2;
    }
  }

  var loginBtn = document.getElementById("dash-login-btn");
  if (loginBtn) { loginBtn.addEventListener("click", function () { openModal("login-modal"); }); }
  var signupBtn = document.getElementById("dash-signup-btn");
  if (signupBtn) { signupBtn.addEventListener("click", function () { openModal("signup-modal"); }); }

  document.addEventListener("click", function (ev) {
    var t = ev.target;
    if (t.hasAttribute && t.hasAttribute("data-dash-del-app")) {
      var aid = t.getAttribute("data-dash-del-app");
      if (!confirm("Withdraw application " + aid + "?")) { return; }
      db.applications = db.applications.filter(function (a) { return a.id !== aid; });
      dbSave(db);
      toast("Application " + aid + " withdrawn.");
      render();
    }
    if (t.hasAttribute && t.hasAttribute("data-dash-del-reg")) {
      var rid = t.getAttribute("data-dash-del-reg");
      if (!confirm("Cancel registration " + rid + "?")) { return; }
      db.registrations = db.registrations.filter(function (r) { return r.id !== rid; });
      dbSave(db);
      toast("Registration " + rid + " cancelled.");
      render();
    }
  });

  // Live: re-render if anything relevant changes in another tab (including
  // logging in/out, or withdrawing/cancelling something from that other tab).
  onSync(function () { render(); });

  // If login or sign-up-then-OTP completes right here on the dashboard
  // (from the guest prompt), refresh immediately rather than waiting.
  var lf = document.getElementById("login-form");
  if (lf) { lf.addEventListener("submit", function () { render(); }); }
  var of = document.getElementById("otp-form");
  if (of) { of.addEventListener("submit", function () { render(); }); }

  render();
});
