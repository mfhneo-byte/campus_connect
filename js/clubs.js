/* ============================================================
   GUB Campus Connect — Clubs module
   CRUD on: clubs, activities, membership applications
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {
  var db = dbLoad();

  var clubGrid   = document.getElementById("club-grid");
  var actList    = document.getElementById("activity-list");
  var actFilter  = document.getElementById("activity-filter");
  var appBody    = document.getElementById("app-body");

  function clubName(id) {
    for (var i = 0; i < db.clubs.length; i++) {
      if (db.clubs[i].id === id) { return db.clubs[i].name; }
    }
    return id;
  }

  /* ---------- rendering ---------- */

  function renderClubs() {
    if (!clubGrid) { return; }
    if (db.clubs.length === 0) {
      clubGrid.innerHTML = '<div class="empty">No clubs registered yet. Turn on Manage mode to add one.</div>';
      return;
    }
    var html = "";
    for (var i = 0; i < db.clubs.length; i++) {
      var c = db.clubs[i];
      var recruit = c.recruiting
        ? '<span class="badge sun">Recruiting now</span>'
        : '<span class="badge gray">Recruitment closed</span>';
      var applyBtn;
      if (!c.recruiting) {
        applyBtn = '<button class="btn ghost small" disabled>Applications closed</button>';
      } else if (c.formUrl) {
        applyBtn = '<button class="btn primary small" data-apply-gform="' + esc(c.id) + '">Apply via Google Form</button>';
      } else {
        applyBtn = '<button class="btn primary small" data-apply="' + esc(c.id) + '">Apply to join</button>';
      }
      html +=
        '<article class="card club-card">' +
          '<div class="top"><div><h3>' + esc(c.name) + '</h3>' +
          '<span class="short">' + esc(c.short) + ' · ' + esc(c.category) + "</span></div>" +
          '<button class="btn danger small admin-only" data-del-club="' + esc(c.id) + '">Delete</button></div>' +
          "<p>" + esc(c.desc) + "</p>" +
          '<div class="meta"><span>Advisor: ' + esc(c.advisor) + "</span><span>" + esc(String(c.members)) + " members</span></div>" +
          '<div class="foot">' + recruit + applyBtn + "</div>" +
        "</article>";
    }
    clubGrid.innerHTML = html;
  }

  function renderActivityFilter() {
    if (!actFilter) { return; }
    var current = actFilter.value || "all";
    var html = '<option value="all">All clubs</option>';
    for (var i = 0; i < db.clubs.length; i++) {
      html += '<option value="' + esc(db.clubs[i].id) + '">' + esc(db.clubs[i].name) + "</option>";
    }
    actFilter.innerHTML = html;
    actFilter.value = current;
    if (actFilter.value !== current) { actFilter.value = "all"; }
  }

  function renderActivities() {
    if (!actList) { return; }
    var pick = actFilter ? actFilter.value : "all";
    var items = db.activities
      .filter(function (a) { return pick === "all" || a.clubId === pick; })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    if (items.length === 0) {
      actList.innerHTML = '<div class="empty">No upcoming activities for this club.</div>';
      return;
    }
    var html = "";
    for (var i = 0; i < items.length; i++) {
      var a = items[i];
      html +=
        '<article class="notice" style="border-left-color: var(--green-leaf);">' +
          '<div class="n-top"><h3>' + esc(a.title) + "</h3>" +
          '<span class="n-date">' + esc(fmtDate(a.date)) +
          ' <button class="btn danger small admin-only" data-del-activity="' + esc(a.id) + '">Delete</button></span></div>' +
          "<p><strong>" + esc(clubName(a.clubId)) + "</strong> &middot; " + esc(a.desc) + "</p>" +
        "</article>";
    }
    actList.innerHTML = html;
  }

  function renderApplications() {
    if (!appBody) { return; }
    if (db.applications.length === 0) {
      appBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--ink-soft);">No membership applications yet.</td></tr>';
      return;
    }
    var html = "";
    for (var i = 0; i < db.applications.length; i++) {
      var ap = db.applications[i];
      html +=
        "<tr>" +
          '<td class="mono">' + esc(ap.id) + "</td>" +
          "<td>" + esc(clubName(ap.clubId)) + "</td>" +
          "<td>" + esc(ap.name) + "</td>" +
          '<td class="mono">' + esc(ap.studentId) + "</td>" +
          "<td>" + esc(ap.dept) + "</td>" +
          '<td class="mono">' + esc(fmtDate(ap.date)) + "</td>" +
          '<td><button class="btn danger small" data-del-app="' + esc(ap.id) + '">Withdraw</button></td>' +
        "</tr>";
    }
    appBody.innerHTML = html;
  }

  function refreshApplyClubSelect() {
    var sel = document.getElementById("apply-club");
    if (!sel) { return; }
    var html = "";
    for (var i = 0; i < db.clubs.length; i++) {
      if (db.clubs[i].recruiting) {
        html += '<option value="' + esc(db.clubs[i].id) + '">' + esc(db.clubs[i].name) + "</option>";
      }
    }
    sel.innerHTML = html;
  }

  function openApplyModal(clubId) {
    refreshApplyClubSelect();
    var sel = document.getElementById("apply-club");
    if (sel) { sel.value = clubId; }
    var user = currentUser();
    var nameEl = document.getElementById("apply-name");
    var sidEl = document.getElementById("apply-sid");
    var emailEl = document.getElementById("apply-email");
    if (user) {
      nameEl.value = user.name; nameEl.readOnly = true;
      sidEl.value = user.studentId; sidEl.readOnly = true;
      emailEl.value = user.email; emailEl.readOnly = true;
    } else {
      nameEl.value = ""; sidEl.value = ""; emailEl.value = "";
      nameEl.readOnly = false; sidEl.readOnly = false; emailEl.readOnly = false;
    }
    openModal("apply-modal");
  }

  /* Google's official embed link is the viewform URL with ?embedded=true;
     keep the person's original URL for the open-in-new-tab fallback. */
  function gformEmbedUrl(url) {
    if (url.indexOf("embedded=true") !== -1) { return url; }
    return url + (url.indexOf("?") !== -1 ? "&" : "?") + "embedded=true";
  }

  function openGFormModal(club) {
    var frame = document.getElementById("gform-frame");
    var newtab = document.getElementById("gform-newtab");
    var label = document.getElementById("gform-club-label");
    if (frame) { frame.src = gformEmbedUrl(club.formUrl); }
    if (newtab) { newtab.href = club.formUrl; }
    if (label) {
      label.textContent = club.name + " collects applications through its own Google Form. " +
        "Your responses go straight to the club, not to this portal's applications table.";
    }
    openModal("gform-modal");
  }

  function closeGFormModal() {
    closeModal("gform-modal");
    var frame = document.getElementById("gform-frame");
    if (frame) { frame.src = "about:blank"; } // stop loading / clear typed answers
  }

  function renderAll() {
    renderClubs();
    renderActivityFilter();
    renderActivities();
    renderApplications();
    refreshApplyClubSelect();
    var actClubSel = document.getElementById("activity-club");
    if (actClubSel) {
      var html = "";
      for (var i = 0; i < db.clubs.length; i++) {
        html += '<option value="' + esc(db.clubs[i].id) + '">' + esc(db.clubs[i].name) + "</option>";
      }
      actClubSel.innerHTML = html;
    }
  }

  /* ---------- create: club, activity, application ---------- */

  var clubForm = document.getElementById("club-form");
  if (clubForm) {
    clubForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var name = document.getElementById("club-name").value.trim();
      var shortName = document.getElementById("club-short").value.trim();
      var category = document.getElementById("club-category").value;
      var advisor = document.getElementById("club-advisor").value.trim();
      var members = parseInt(document.getElementById("club-members").value, 10) || 0;
      var recruiting = document.getElementById("club-recruiting").checked;
      var desc = document.getElementById("club-desc").value.trim();
      var gformEl = document.getElementById("club-gform");
      var formUrl = gformEl ? gformEl.value.trim() : "";
      if (!name || !shortName || !advisor || !desc) {
        toast("Fill in every club field.", true);
        return;
      }
      if (formUrl && !/^https:\/\/(docs\.google\.com\/forms\/|forms\.gle\/)/.test(formUrl)) {
        toast("The form link must be a Google Forms URL (docs.google.com/forms/… or forms.gle/…).", true);
        return;
      }
      var rec = { id: nextId("C", db.clubs, 2), name: name, short: shortName, category: category, advisor: advisor, members: members, recruiting: recruiting, desc: desc };
      if (formUrl) { rec.formUrl = formUrl; }
      db.clubs.push(rec);
      dbSave(db, { message: "🎭 New club registered: " + rec.name });
      clubForm.reset();
      renderAll();
      toast("Club " + rec.id + " (" + shortName + ") added.");
    });
  }

  var activityForm = document.getElementById("activity-form");
  if (activityForm) {
    activityForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var clubId = document.getElementById("activity-club").value;
      var title  = document.getElementById("activity-title").value.trim();
      var date   = document.getElementById("activity-date").value;
      var desc   = document.getElementById("activity-desc").value.trim();
      if (!clubId || !title || !date || !desc) {
        toast("Fill in every activity field.", true);
        return;
      }
      var rec = { id: nextId("A", db.activities, 3), clubId: clubId, title: title, date: date, desc: desc };
      db.activities.push(rec);
      dbSave(db, { message: "🗓️ New club activity: " + rec.title });
      activityForm.reset();
      renderActivities();
      toast("Activity " + rec.id + " added.");
    });
  }

  var applyForm = document.getElementById("apply-form");
  if (applyForm) {
    applyForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var clubId = document.getElementById("apply-club").value;
      var name = document.getElementById("apply-name").value.trim();
      var sid  = document.getElementById("apply-sid").value.trim();
      var dept = document.getElementById("apply-dept").value;
      var email = document.getElementById("apply-email").value.trim();
      if (!clubId || !name || !sid || !email) {
        toast("Fill in every application field.", true);
        return;
      }
      if (!/^[0-9]{9}$/.test(sid)) {
        toast("Student ID must be a 9-digit number, e.g. 231002015.", true);
        return;
      }
      for (var i = 0; i < db.applications.length; i++) {
        if (db.applications[i].clubId === clubId && db.applications[i].studentId === sid) {
          toast("This student ID has already applied to that club.", true);
          return;
        }
      }
      var rec = { id: nextId("AP", db.applications, 3), clubId: clubId, name: name, studentId: sid, dept: dept, email: email, date: todayISO(), status: "Pending" };
      db.applications.push(rec);
      dbSave(db);
      applyForm.reset();
      closeModal("apply-modal");
      renderApplications();
      toast("Application " + rec.id + " submitted to " + clubName(clubId) + ".");
    });
  }

  /* ---------- clicks: apply buttons + deletes ---------- */

  document.addEventListener("click", function (ev) {
    var t = ev.target;

    if (t.hasAttribute && t.hasAttribute("data-apply")) {
      var clubId = t.getAttribute("data-apply");
      requireLogin(function () { openApplyModal(clubId); });
    }
    if (t.hasAttribute && t.hasAttribute("data-apply-gform")) {
      var gClubId = t.getAttribute("data-apply-gform");
      var gClub = null;
      for (var gi = 0; gi < db.clubs.length; gi++) {
        if (db.clubs[gi].id === gClubId) { gClub = db.clubs[gi]; break; }
      }
      if (gClub && gClub.formUrl) {
        requireLogin(function () { openGFormModal(gClub); });
      }
    }
    if (t.id === "gform-done") { closeGFormModal(); }

    if (t.hasAttribute && t.hasAttribute("data-del-club")) {
      var cid = t.getAttribute("data-del-club");
      if (!confirm("Delete club " + cid + "? Its activities and pending applications will be removed too.")) { return; }
      db.clubs = db.clubs.filter(function (c) { return c.id !== cid; });
      db.activities = db.activities.filter(function (a) { return a.clubId !== cid; });     // referential integrity
      db.applications = db.applications.filter(function (a) { return a.clubId !== cid; }); // referential integrity
      dbSave(db);
      renderAll();
      toast("Club " + cid + " and its related records were deleted.");
    }

    if (t.hasAttribute && t.hasAttribute("data-del-activity")) {
      var aid = t.getAttribute("data-del-activity");
      if (!confirm("Delete activity " + aid + "?")) { return; }
      db.activities = db.activities.filter(function (a) { return a.id !== aid; });
      dbSave(db);
      renderActivities();
      toast("Activity " + aid + " deleted.");
    }

    if (t.hasAttribute && t.hasAttribute("data-del-app")) {
      var apid = t.getAttribute("data-del-app");
      if (!confirm("Withdraw application " + apid + "?")) { return; }
      db.applications = db.applications.filter(function (a) { return a.id !== apid; });
      dbSave(db);
      renderApplications();
      toast("Application " + apid + " withdrawn.");
    }
  });

  if (actFilter) { actFilter.addEventListener("change", renderActivities); }

  var applyCancel = document.getElementById("apply-cancel");
  if (applyCancel) {
    applyCancel.addEventListener("click", function () { closeModal("apply-modal"); });
  }

  // Live: silently pick up changes made in another tab (new club/activity,
  // a deletion, or someone else's application appearing in the table).
  onSync(function () { db = dbLoad(); renderAll(); });

  renderAll();
});
