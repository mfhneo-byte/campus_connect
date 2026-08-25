/* ============================================================
   GUB Campus Connect — Transport module
   CRUD on: routes, schedules, notices
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {
  var db = dbLoad();

  var routeGrid    = document.getElementById("route-grid");
  var schedBody    = document.getElementById("sched-body");
  var schedFilter  = document.getElementById("sched-filter");
  var noticeList   = document.getElementById("notice-list");

  /* ---------- rendering ---------- */

  function routeName(id) {
    for (var i = 0; i < db.routes.length; i++) {
      if (db.routes[i].id === id) { return db.routes[i].name; }
    }
    return id;
  }

  function renderRoutes() {
    if (!routeGrid) { return; }
    if (db.routes.length === 0) {
      routeGrid.innerHTML = '<div class="empty">No bus routes yet. Turn on Manage mode to add the first route.</div>';
      return;
    }
    var html = "";
    for (var i = 0; i < db.routes.length; i++) {
      var r = db.routes[i];
      var strip = "";
      for (var s = 0; s < r.stops.length; s++) {
        if (s > 0) { strip += '<span class="sseg"></span>'; }
        strip += '<span class="sdot"></span><span class="slbl">' + esc(r.stops[s]) + "</span>";
      }
      html +=
        '<article class="card route-card">' +
          '<div class="top">' +
            '<span class="route-code">' + esc(r.id) + "</span>" +
            '<button class="btn danger small admin-only" data-del-route="' + esc(r.id) + '">Delete</button>' +
          "</div>" +
          "<h3>" + esc(r.name) + "</h3>" +
          '<div class="ends">' + esc(r.start) + " &rarr; " + esc(r.end) + "</div>" +
          '<div class="stopstrip">' + strip + "</div>" +
        "</article>";
    }
    routeGrid.innerHTML = html;
  }

  function renderFilter() {
    if (!schedFilter) { return; }
    var current = schedFilter.value || "all";
    var html = '<option value="all">All routes</option>';
    for (var i = 0; i < db.routes.length; i++) {
      html += '<option value="' + esc(db.routes[i].id) + '">' + esc(db.routes[i].id) + " · " + esc(db.routes[i].name) + "</option>";
    }
    schedFilter.innerHTML = html;
    schedFilter.value = current;
    if (schedFilter.value !== current) { schedFilter.value = "all"; }
  }

  function renderSchedules() {
    if (!schedBody) { return; }
    var pick = schedFilter ? schedFilter.value : "all";
    var rows = "";
    var shown = 0;
    for (var i = 0; i < db.schedules.length; i++) {
      var s = db.schedules[i];
      if (pick !== "all" && s.routeId !== pick) { continue; }
      shown++;
      rows +=
        "<tr>" +
          '<td class="mono">' + esc(s.routeId) + "</td>" +
          "<td>" + esc(routeName(s.routeId)) + "</td>" +
          '<td class="mono">' + esc(s.busNo) + "</td>" +
          '<td class="mono">' + esc(fmtTime(s.departs)) + "</td>" +
          '<td class="mono">' + esc(fmtTime(s.arrives)) + "</td>" +
          "<td>" + esc(s.direction) + "</td>" +
          "<td>" + esc(s.shift) + "</td>" +
          '<td class="admin-only"><button class="btn danger small" data-del-sched="' + esc(s.id) + '">Delete</button></td>' +
        "</tr>";
    }
    if (shown === 0) {
      rows = '<tr><td colspan="8" style="text-align:center;color:var(--ink-soft);">No trips found for this route.</td></tr>';
    }
    schedBody.innerHTML = rows;
  }

  function renderNotices() {
    if (!noticeList) { return; }
    if (db.notices.length === 0) {
      noticeList.innerHTML = '<div class="empty">No transport notices right now.</div>';
      return;
    }
    var sorted = db.notices.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var html = "";
    for (var i = 0; i < sorted.length; i++) {
      var n = sorted[i];
      html +=
        '<article class="notice">' +
          '<div class="n-top"><h3>' + esc(n.title) + "</h3>" +
          '<span class="n-date">' + esc(fmtDate(n.date)) +
          ' <button class="btn danger small admin-only" data-del-notice="' + esc(n.id) + '">Delete</button></span></div>' +
          "<p>" + esc(n.body) + "</p>" +
        "</article>";
    }
    noticeList.innerHTML = html;
  }

  function renderAll() {
    renderRoutes();
    renderFilter();
    renderSchedules();
    renderNotices();
    var routeSelect = document.getElementById("sched-route");
    if (routeSelect) {
      var html = "";
      for (var i = 0; i < db.routes.length; i++) {
        html += '<option value="' + esc(db.routes[i].id) + '">' + esc(db.routes[i].id) + " · " + esc(db.routes[i].name) + "</option>";
      }
      routeSelect.innerHTML = html;
    }
  }

  /* ---------- create ---------- */

  var routeForm = document.getElementById("route-form");
  if (routeForm) {
    routeForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var name  = document.getElementById("route-name").value.trim();
      var start = document.getElementById("route-start").value.trim();
      var end   = document.getElementById("route-end").value.trim();
      var stops = document.getElementById("route-stops").value.split(",")
                    .map(function (x) { return x.trim(); })
                    .filter(function (x) { return x.length > 0; });
      if (!name || !start || !end || stops.length < 2) {
        toast("Fill in every field and give at least two stops.", true);
        return;
      }
      var rec = { id: nextId("R", db.routes, 2), name: name, start: start, end: end, stops: stops };
      db.routes.push(rec);
      dbSave(db);
      routeForm.reset();
      renderAll();
      toast("Route " + rec.id + " added.");
    });
  }

  var schedForm = document.getElementById("sched-form");
  if (schedForm) {
    schedForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var routeId = document.getElementById("sched-route").value;
      var busNo   = document.getElementById("sched-bus").value.trim();
      var departs = document.getElementById("sched-dep").value;
      var arrives = document.getElementById("sched-arr").value;
      var dir     = document.getElementById("sched-dir").value;
      var shift   = document.getElementById("sched-shift").value;
      if (!routeId || !busNo || !departs || !arrives) {
        toast("Fill in every schedule field.", true);
        return;
      }
      var rec = { id: nextId("S", db.schedules, 3), routeId: routeId, busNo: busNo, departs: departs, arrives: arrives, direction: dir, shift: shift };
      db.schedules.push(rec);
      dbSave(db);
      schedForm.reset();
      renderAll();
      toast("Trip " + rec.id + " added to the schedule.");
    });
  }

  var noticeForm = document.getElementById("notice-form");
  if (noticeForm) {
    noticeForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var title = document.getElementById("notice-title").value.trim();
      var date  = document.getElementById("notice-date").value || todayISO();
      var body  = document.getElementById("notice-body").value.trim();
      if (!title || !body) {
        toast("A notice needs a title and a description.", true);
        return;
      }
      var rec = { id: nextId("N", db.notices, 3), title: title, date: date, body: body };
      db.notices.push(rec);
      dbSave(db, { message: "📢 New transport notice: " + rec.title });
      noticeForm.reset();
      renderNotices();
      toast("Notice " + rec.id + " published.");
    });
  }

  /* ---------- delete (event delegation) ---------- */

  document.addEventListener("click", function (ev) {
    var t = ev.target;

    if (t.hasAttribute && t.hasAttribute("data-del-route")) {
      var rid = t.getAttribute("data-del-route");
      if (!confirm("Delete route " + rid + "? Its schedule entries will be removed too.")) { return; }
      db.routes = db.routes.filter(function (r) { return r.id !== rid; });
      db.schedules = db.schedules.filter(function (s) { return s.routeId !== rid; }); // referential integrity
      dbSave(db);
      renderAll();
      toast("Route " + rid + " and its trips were deleted.");
    }

    if (t.hasAttribute && t.hasAttribute("data-del-sched")) {
      var sid = t.getAttribute("data-del-sched");
      if (!confirm("Delete trip " + sid + " from the schedule?")) { return; }
      db.schedules = db.schedules.filter(function (s) { return s.id !== sid; });
      dbSave(db);
      renderSchedules();
      toast("Trip " + sid + " deleted.");
    }

    if (t.hasAttribute && t.hasAttribute("data-del-notice")) {
      var nid = t.getAttribute("data-del-notice");
      if (!confirm("Delete notice " + nid + "?")) { return; }
      db.notices = db.notices.filter(function (n) { return n.id !== nid; });
      dbSave(db);
      renderNotices();
      toast("Notice " + nid + " deleted.");
    }
  });

  if (schedFilter) { schedFilter.addEventListener("change", renderSchedules); }

  // Live: silently pick up changes made in another tab (e.g. Manage mode
  // used elsewhere, or a route deleted from another session).
  onSync(function () { db = dbLoad(); renderAll(); });

  renderAll();
});
