/* ============================================================
   GUB Campus Connect — Events module
   CRUD on: events, registrations
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {
  var db = dbLoad();

  var eventGrid = document.getElementById("event-grid");
  var regBody   = document.getElementById("reg-body");

  var MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  function eventStartMs(e) {
    var t = new Date(e.date + "T" + (e.time || "00:00") + ":00").getTime();
    return isNaN(t) ? null : t;
  }

  function formatCountdown(targetMs) {
    var diff = targetMs - Date.now();
    if (diff <= 0) { return "Happening now"; }
    var totalSec = Math.floor(diff / 1000);
    var d = Math.floor(totalSec / 86400);
    var h = Math.floor((totalSec % 86400) / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    if (d > 0) { return "Starts in " + d + "d " + h + "h " + m + "m"; }
    if (h > 0) { return "Starts in " + h + "h " + m + "m " + s + "s"; }
    return "Starts in " + m + "m " + s + "s";
  }

  /* One shared ticking loop updates every card's countdown text each
     second without touching the rest of the DOM, so it never fights
     with a full re-render triggered by live sync or the route filter. */
  function tickCountdowns() {
    var els = document.querySelectorAll(".countdown[data-countdown]");
    for (var i = 0; i < els.length; i++) {
      var target = parseInt(els[i].getAttribute("data-countdown"), 10);
      if (isNaN(target)) { continue; }
      var text = formatCountdown(target);
      els[i].textContent = text;
      els[i].classList.toggle("now", text === "Happening now");
    }
  }
  setInterval(tickCountdowns, 1000);

  function eventById(id) {
    for (var i = 0; i < db.events.length; i++) {
      if (db.events[i].id === id) { return db.events[i]; }
    }
    return null;
  }

  function regCount(eventId) {
    var n = 0;
    for (var i = 0; i < db.registrations.length; i++) {
      if (db.registrations[i].eventId === eventId) { n++; }
    }
    return n;
  }

  /* ---------- rendering ---------- */

  function renderEvents() {
    if (!eventGrid) { return; }
    if (db.events.length === 0) {
      eventGrid.innerHTML = '<div class="empty">No events scheduled. Turn on Manage mode to add one.</div>';
      return;
    }
    var sorted = db.events.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var html = "";
    for (var i = 0; i < sorted.length; i++) {
      var e = sorted[i];
      var parts = e.date.split("-");
      var day = parts[2] || "";
      var mon = MONTHS[(parseInt(parts[1], 10) || 1) - 1];
      var taken = regCount(e.id);
      var full = taken >= e.capacity;
      var pct = e.capacity > 0 ? Math.min(100, Math.round((taken / e.capacity) * 100)) : 0;
      var regBtn = full
        ? '<button class="btn ghost small" disabled>Event full</button>'
        : '<button class="btn primary small" data-register="' + esc(e.id) + '">Register</button>';
      var startMs = eventStartMs(e);
      var countdownHtml = startMs
        ? '<div class="countdown-line">⏱ <span class="countdown" data-countdown="' + startMs + '">calculating…</span></div>'
        : "";
      html +=
        '<article class="card event-card">' +
          '<div class="datebox"><div class="d">' + esc(day) + '</div><div class="m">' + esc(mon) + "</div></div>" +
          '<div class="body">' +
            '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">' +
              "<h3>" + esc(e.title) + "</h3>" +
              '<button class="btn danger small admin-only" data-del-event="' + esc(e.id) + '">Delete</button>' +
            "</div>" +
            '<div class="meta"><span class="badge green">' + esc(e.category) + "</span> &nbsp;" +
              esc(fmtTime(e.time)) + " &middot; " + esc(e.venue) + " &middot; " + esc(e.organizer) + "</div>" +
            countdownHtml +
            "<p>" + esc(e.desc) + "</p>" +
            '<div class="foot">' +
              '<div class="capbar" title="' + taken + " of " + e.capacity + ' seats taken"><span style="width:' + pct + '%"></span></div>' +
              '<span class="cap-note">' + taken + " / " + e.capacity + " seats</span>" +
              regBtn +
            "</div>" +
          "</div>" +
        "</article>";
    }
    eventGrid.innerHTML = html;
  }

  function renderRegistrations() {
    if (!regBody) { return; }
    if (db.registrations.length === 0) {
      regBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--ink-soft);">No registrations yet.</td></tr>';
      return;
    }
    var html = "";
    for (var i = 0; i < db.registrations.length; i++) {
      var r = db.registrations[i];
      var e = eventById(r.eventId);
      html +=
        "<tr>" +
          '<td class="mono">' + esc(r.id) + "</td>" +
          "<td>" + esc(e ? e.title : r.eventId) + "</td>" +
          "<td>" + esc(r.name) + "</td>" +
          '<td class="mono">' + esc(r.studentId) + "</td>" +
          '<td class="mono">' + esc(fmtDate(r.date)) + "</td>" +
          '<td><button class="btn danger small" data-del-reg="' + esc(r.id) + '">Cancel</button></td>' +
        "</tr>";
    }
    regBody.innerHTML = html;
  }

  function renderAll() { renderEvents(); renderRegistrations(); }

  function openRegisterModal(id) {
    var e = eventById(id);
    if (!e) { return; }
    document.getElementById("reg-event-id").value = id;
    var label = document.getElementById("reg-event-label");
    if (label) { label.textContent = e.title + " — " + fmtDate(e.date) + ", " + e.venue; }
    var user = currentUser();
    var nameEl = document.getElementById("reg-name");
    var sidEl = document.getElementById("reg-sid");
    var emailEl = document.getElementById("reg-email");
    if (user) {
      nameEl.value = user.name; nameEl.readOnly = true;
      sidEl.value = user.studentId; sidEl.readOnly = true;
      emailEl.value = user.email; emailEl.readOnly = true;
    } else {
      nameEl.value = ""; sidEl.value = ""; emailEl.value = "";
      nameEl.readOnly = false; sidEl.readOnly = false; emailEl.readOnly = false;
    }
    openModal("reg-modal");
  }

  /* ---------- create: event, registration ---------- */

  var eventForm = document.getElementById("event-form");
  if (eventForm) {
    eventForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var title = document.getElementById("event-title").value.trim();
      var category = document.getElementById("event-category").value;
      var date = document.getElementById("event-date").value;
      var time = document.getElementById("event-time").value;
      var venue = document.getElementById("event-venue").value.trim();
      var organizer = document.getElementById("event-organizer").value.trim();
      var capacity = parseInt(document.getElementById("event-capacity").value, 10);
      var desc = document.getElementById("event-desc").value.trim();
      if (!title || !date || !time || !venue || !organizer || !desc || isNaN(capacity) || capacity < 1) {
        toast("Fill in every event field (capacity must be at least 1).", true);
        return;
      }
      var rec = { id: nextId("E", db.events, 3), title: title, category: category, date: date, time: time, venue: venue, organizer: organizer, capacity: capacity, desc: desc };
      db.events.push(rec);
      dbSave(db, { message: "🎉 New event: " + rec.title });
      eventForm.reset();
      renderEvents();
      toast("Event " + rec.id + " published.");
    });
  }

  var regForm = document.getElementById("reg-form");
  if (regForm) {
    regForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var eventId = document.getElementById("reg-event-id").value;
      var name = document.getElementById("reg-name").value.trim();
      var sid  = document.getElementById("reg-sid").value.trim();
      var email = document.getElementById("reg-email").value.trim();
      var e = eventById(eventId);
      if (!e) { toast("That event no longer exists.", true); return; }
      if (!name || !sid || !email) {
        toast("Fill in every registration field.", true);
        return;
      }
      if (!/^[0-9]{9}$/.test(sid)) {
        toast("Student ID must be a 9-digit number, e.g. 221002034.", true);
        return;
      }
      for (var i = 0; i < db.registrations.length; i++) {
        if (db.registrations[i].eventId === eventId && db.registrations[i].studentId === sid) {
          toast("This student ID is already registered for " + e.title + ".", true);
          return;
        }
      }
      if (regCount(eventId) >= e.capacity) {
        toast("Sorry, " + e.title + " is already full.", true);
        renderEvents();
        return;
      }
      var rec = { id: nextId("REG", db.registrations, 3), eventId: eventId, name: name, studentId: sid, email: email, date: todayISO() };
      db.registrations.push(rec);
      dbSave(db);
      regForm.reset();
      closeModal("reg-modal");
      renderAll();
      toast("Registered! Your registration ID is " + rec.id + ".");
    });
  }

  /* ---------- clicks: register buttons + deletes ---------- */

  document.addEventListener("click", function (ev) {
    var t = ev.target;

    if (t.hasAttribute && t.hasAttribute("data-register")) {
      var id = t.getAttribute("data-register");
      requireLogin(function () { openRegisterModal(id); });
    }

    if (t.hasAttribute && t.hasAttribute("data-del-event")) {
      var eid = t.getAttribute("data-del-event");
      if (!confirm("Delete event " + eid + "? Its registrations will be removed too.")) { return; }
      db.events = db.events.filter(function (x) { return x.id !== eid; });
      db.registrations = db.registrations.filter(function (r) { return r.eventId !== eid; }); // referential integrity
      dbSave(db);
      renderAll();
      toast("Event " + eid + " and its registrations were deleted.");
    }

    if (t.hasAttribute && t.hasAttribute("data-del-reg")) {
      var rid = t.getAttribute("data-del-reg");
      if (!confirm("Cancel registration " + rid + "?")) { return; }
      db.registrations = db.registrations.filter(function (r) { return r.id !== rid; });
      dbSave(db);
      renderAll();
      toast("Registration " + rid + " cancelled.");
    }
  });

  var regCancel = document.getElementById("reg-cancel");
  if (regCancel) {
    regCancel.addEventListener("click", function () { closeModal("reg-modal"); });
  }

  // Live: silently pick up changes from another tab — including someone
  // else's registration, which moves the seat bar right in front of you.
  onSync(function () { db = dbLoad(); renderAll(); });

  renderAll();
});
