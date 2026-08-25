/* ============================================================
   GUB Campus Connect — Home dashboard
   Reads live counts and previews from the data store
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {
  var db, today;

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) { el.textContent = String(value); }
  }

  function clubName(id) {
    for (var i = 0; i < db.clubs.length; i++) {
      if (db.clubs[i].id === id) { return db.clubs[i].name; }
    }
    return id;
  }

  function render() {
    db = dbLoad();
    today = todayISO();
    var upcomingEvents = db.events.filter(function (e) { return e.date >= today; });

    setText("stat-routes", db.routes.length);
    setText("stat-clubs", db.clubs.length);
    setText("stat-events", upcomingEvents.length);

    /* Transportation notices (top 2 newest) */
    var noticeUl = document.getElementById("home-notices");
    if (noticeUl) {
      var notices = db.notices.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 2);
      if (notices.length === 0) {
        noticeUl.innerHTML = '<li><span>No notices right now.</span></li>';
      } else {
        var html = "";
        for (var i = 0; i < notices.length; i++) {
          html += '<li><span class="mdate">' + esc(fmtDate(notices[i].date)) + "</span><span><strong>" +
                  esc(notices[i].title) + "</strong></span></li>";
        }
        noticeUl.innerHTML = html;
      }
    }

    /* Club activities (next 3 upcoming) */
    var actUl = document.getElementById("home-activities");
    if (actUl) {
      var nextActs = db.activities
        .filter(function (a) { return a.date >= today; })
        .sort(function (a, b) { return a.date < b.date ? -1 : 1; })
        .slice(0, 3);
      if (nextActs.length === 0) {
        actUl.innerHTML = '<li><span>No upcoming activities yet.</span></li>';
      } else {
        var actHtml = "";
        for (var k = 0; k < nextActs.length; k++) {
          actHtml += '<li><span class="mdate">' + esc(fmtDate(nextActs[k].date)) + "</span><span><strong>" +
                     esc(nextActs[k].title) + "</strong> &middot; " + esc(clubName(nextActs[k].clubId)) + "</span></li>";
        }
        actUl.innerHTML = actHtml;
      }
    }

    /* Events alerts (top 3 upcoming by date) */
    var eventUl = document.getElementById("home-events");
    if (eventUl) {
      var next = upcomingEvents.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).slice(0, 3);
      if (next.length === 0) {
        eventUl.innerHTML = '<li><span>No upcoming events yet.</span></li>';
      } else {
        var out = "";
        for (var j = 0; j < next.length; j++) {
          out += '<li><span class="mdate">' + esc(fmtDate(next[j].date)) + "</span><span><strong>" +
                 esc(next[j].title) + "</strong> &middot; " + esc(next[j].venue) + "</span></li>";
        }
        eventUl.innerHTML = out;
      }
    }
  }

  // Live: home stats and previews refresh instantly if data changes in
  // another tab (e.g. Manage mode publishing something elsewhere).
  onSync(function () { render(); });

  render();
});
