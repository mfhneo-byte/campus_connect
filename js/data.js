/* ============================================================
   GUB Campus Connect — data layer
   Entities: users, routes, schedules, notices, clubs, activities,
             applications, events, registrations
   Storage : browser localStorage (key: gubcc_db_v2)

   Route waypoints, pickup times, club names and venue names below
   are sourced from Green University of Bangladesh's own published
   materials (green.edu.bd, its transport notices, and its club
   directory). Member counts, recruitment status, activity/event
   dates and the demo account are illustrative placeholders for
   this CRUD prototype, not scraped facts — see the report for the
   full breakdown of what is sourced vs. illustrative.
   ============================================================ */

var DB_KEY = "gubcc_db_v2";

/* ---------- cross-tab live sync ----------
   Every dbSave() broadcasts to any other open tab on this same site via
   BroadcastChannel, so other tabs can silently re-render with the latest
   data (live seat counts, live tables) and, when told to, show a "New: ..."
   banner for freshly-published content. Falls back to no-op if the
   browser doesn't support BroadcastChannel — nothing breaks, it just
   won't sync live. This never touches another device, only other tabs
   of the same browser, since it still rides on localStorage underneath. */
var syncChannel = null;
try { syncChannel = new BroadcastChannel("gubcc_sync"); } catch (e) { syncChannel = null; }

/* Register a handler for live updates from other tabs.
   handler(announce) is called on every change; announce is either
   null (silent data change — just re-render) or { message } (something
   worth telling the person about, e.g. a newly published event). */
function onSync(handler) {
  if (!syncChannel) { return; }
  syncChannel.addEventListener("message", function (ev) {
    handler(ev && ev.data ? ev.data.announce : null);
  });
}

var GUB_SEED = {

  /* Demo login: demo@student.green.edu.bd / demo1234 */
  users: [
    { id: "U-001", name: "Demo Student", email: "demo@student.green.edu.bd", studentId: "231001001", mobile: "01712345678", password: "demo1234", joined: "2026-07-01" }
  ],

  routes: [
    {
      id: "R-01", name: "Mirpur Line",
      start: "Mirpur-10 (Metro Rail Station)", end: "GUB Purbachal Campus",
      stops: ["Mirpur-10 (Metro Rail Station)", "Mirpur-12 (Ceramic Gate)", "Setara Convention Hall (Mirpur 11.5)", "Kalshi Mor Bus Stand", "Kuril (BRTC Counter)", "Kanchan Bridge", "Campus"]
    },
    {
      id: "R-02", name: "Shewrapara–Banani Line",
      start: "Shewrapara (City Info. Center)", end: "GUB Purbachal Campus",
      stops: ["Shewrapara (City Info. Center)", "Agargaon (Metro Rail Station)", "Mohakhali (Amtoli Bus Stoppage)", "Banani Bus Stoppage", "Kuril (BRTC Counter)", "Kanchan Bridge", "Campus"]
    },
    {
      id: "R-03", name: "DU–Farmgate Line",
      start: "Polashir Mor (BUET)", end: "GUB Purbachal Campus",
      stops: ["Polashir Mor (BUET)", "Jagannath Hall (DU)", "TSC (DU)", "Shahbagh (Nat'l Museum)", "Ananda Cinema Hall, Farmgate", "Kakoli Bus Stand", "Kuril (BRTC Counter)", "Campus"]
    },
    {
      id: "R-04", name: "Motijheel Line",
      start: "Shapla Chattar, Motijheel", end: "GUB Purbachal Campus",
      stops: ["Shapla Chattar, Motijheel", "Kakrail Bus Stand", "Mouchak Bus Stand (Fortune Mall)", "Rampura (NRBC Bank)", "Badda (Islamia Eye Hospital)", "Kuril (BRTC Counter)", "Campus"]
    },
    {
      id: "R-05", name: "Dhanmondi–Mirpur Line",
      start: "Japan-BD Friendship Hospital", end: "GUB Purbachal Campus",
      stops: ["Japan-BD Friendship Hospital, Satmasjid Rd", "Technical Mor", "Mirpur-1 (New Market)", "Mirpur-10 (Metro Rail Station)", "Kalshi Mor Bus Stand", "Kuril (BRTC Counter)", "Campus"]
    },
    {
      id: "R-06", name: "Uttara–Airport Line",
      start: "Abdullahpur Bus Stand", end: "GUB Purbachal Campus",
      stops: ["Abdullahpur Bus Stand", "Uttara House Building", "Azampur Bus Stand", "Airport Bus Stand", "Kuril (BRTC Counter)", "Kanchan Bridge", "Campus"]
    },
    {
      id: "R-07", name: "Shyamoli Line",
      start: "Shyamoli Bus Stoppage", end: "GUB Purbachal Campus",
      stops: ["Shyamoli Bus Stoppage", "Technical Mor (Asia Cinema Hall)", "Mirpur-1 (New Market Gate)", "Mirpur-10", "Kuril (BRTC Counter)", "Campus"]
    },
    {
      id: "R-08", name: "Narayanganj Local Line",
      start: "Chashara, Narayanganj", end: "GUB Purbachal Campus",
      stops: ["Chashara, Narayanganj", "Signboard", "Rupganj Bus Stand", "Kanchan Bridge", "Campus"]
    }
  ],

  schedules: [
    { id: "S-001", routeId: "R-01", busNo: "GUB-01", departs: "07:05", arrives: "08:30", direction: "To Campus",   shift: "Morning" },
    { id: "S-002", routeId: "R-01", busNo: "GUB-01", departs: "16:50", arrives: "18:10", direction: "From Campus", shift: "Evening" },
    { id: "S-003", routeId: "R-02", busNo: "GUB-02", departs: "07:00", arrives: "08:40", direction: "To Campus",   shift: "Morning" },
    { id: "S-004", routeId: "R-02", busNo: "GUB-02", departs: "13:15", arrives: "14:50", direction: "From Campus", shift: "Afternoon" },
    { id: "S-005", routeId: "R-03", busNo: "GUB-03", departs: "06:50", arrives: "08:25", direction: "To Campus",   shift: "Morning" },
    { id: "S-006", routeId: "R-03", busNo: "GUB-03", departs: "16:50", arrives: "18:20", direction: "From Campus", shift: "Evening" },
    { id: "S-007", routeId: "R-04", busNo: "GUB-04", departs: "07:10", arrives: "08:35", direction: "To Campus",   shift: "Morning" },
    { id: "S-008", routeId: "R-04", busNo: "GUB-04", departs: "13:15", arrives: "14:35", direction: "From Campus", shift: "Afternoon" },
    { id: "S-009", routeId: "R-05", busNo: "GUB-05", departs: "07:00", arrives: "08:30", direction: "To Campus",   shift: "Morning" },
    { id: "S-010", routeId: "R-06", busNo: "GUB-06", departs: "06:45", arrives: "08:20", direction: "To Campus",   shift: "Morning" },
    { id: "S-011", routeId: "R-06", busNo: "GUB-06", departs: "16:50", arrives: "18:25", direction: "From Campus", shift: "Evening" },
    { id: "S-012", routeId: "R-07", busNo: "GUB-07", departs: "07:15", arrives: "08:45", direction: "To Campus",   shift: "Morning" },
    { id: "S-013", routeId: "R-08", busNo: "GUB-08", departs: "07:30", arrives: "08:30", direction: "To Campus",   shift: "Morning" },
    { id: "S-014", routeId: "R-08", busNo: "GUB-08", departs: "16:50", arrives: "17:50", direction: "From Campus", shift: "Evening" }
  ],

  /* Dates below line up with GUB's published 2026 holiday calendar. */
  notices: [
    {
      id: "N-001", title: "No shuttle service — Janmashtami (16 August 2026)",
      date: "2026-08-10",
      body: "University holiday for Janmashtami. All shuttle routes are suspended on 16 August 2026 and resume on the next working day."
    },
    {
      id: "N-002", title: "Reduced service around Eid-e-Miladunnabi (5 September 2026)",
      date: "2026-08-28",
      body: "Only the Morning slot will run on 4–6 September 2026 for Eid-e-Miladunnabi. Afternoon and Evening trips resume on 7 September."
    },
    {
      id: "N-003", title: "Autumn 2026 bus pass renewal",
      date: "2026-07-05",
      body: "Renew your transport card at the Transport Office before the Autumn semester begins. Bring your student ID card and the payment slip."
    }
  ],

  /* Full club directory as published on green.edu.bd (Central + Departmental). */
  clubs: [
    { id: "C-01", name: "Debating Club", short: "GUBDC", category: "Academic", advisor: "Office of Student Affairs, GUB", members: 96, recruiting: true,
      desc: "Bangla and English parliamentary debate, public speaking sessions and inter-university debate tournaments." },
    { id: "C-02", name: "Eco-Warrior Club", short: "EWC", category: "Environment", advisor: "Office of Student Affairs, GUB", members: 64, recruiting: true,
      desc: "Campus sustainability drives: tree planting, waste-segregation awareness and green-campus campaigns." },
    { id: "C-03", name: "Green Theater", short: "GT", category: "Cultural", advisor: "Office of Student Affairs, GUB", members: 58, recruiting: false,
      desc: "Stage drama, script-writing and direction — GUB's resident theatre troupe for campus productions." },
    { id: "C-04", name: "Photography Club", short: "GUBPC", category: "Creative", advisor: "Office of Student Affairs, GUB", members: 112, recruiting: true,
      desc: "Photo walks, mobile-photography contests and the yearly campus photography exhibition." },
    { id: "C-05", name: "Reading Society", short: "RS", category: "Academic", advisor: "Office of Student Affairs, GUB", members: 47, recruiting: false,
      desc: "Book discussions, author sessions and a peer-to-peer lending library for GUB students." },
    { id: "C-06", name: "Cultural Club", short: "GUCC", category: "Cultural", advisor: "Office of Student Affairs, GUB", members: 184, recruiting: true,
      desc: "Music, dance and recitation. Organises cultural nights and national-day celebrations on campus." },
    { id: "C-07", name: "Sports Club", short: "GUBSC", category: "Sports", advisor: "Physical Education Office, GUB", members: 221, recruiting: true,
      desc: "Cricket, football, badminton and table-tennis squads, plus the annual Inter-Department Sports Week." },
    { id: "C-08", name: "Robotics Club", short: "GUBRC", category: "Technology", advisor: "Dept. of EEE", members: 133, recruiting: true,
      desc: "Robotics builds, microcontroller workshops and inter-university robotics competitions." },
    { id: "C-09", name: "Leo Club", short: "Leo", category: "Community Service", advisor: "Office of Student Affairs, GUB", members: 89, recruiting: true,
      desc: "GUB's community-service club (affiliated with Lions Clubs International): blood donation camps, relief drives and volunteering." },
    { id: "C-10", name: "Social Bonding Club", short: "SBC", category: "Social", advisor: "Office of Student Affairs, GUB", members: 71, recruiting: false,
      desc: "Cross-department mixers, games nights and new-student welcome circles." },
    { id: "C-11", name: "Green University Business Club", short: "GUBC", category: "Departmental · Business", advisor: "Dept. of Business Administration", members: 205, recruiting: true,
      desc: "Case competitions, corporate webinars and networking events for Green Business School students." },
    { id: "C-12", name: "Computer Club", short: "GUCC-CSE", category: "Departmental · Technology", advisor: "Dept. of CSE", members: 176, recruiting: true,
      desc: "Competitive programming, hackathons and workshops on web and app development." },
    { id: "C-13", name: "EEE Club", short: "EEEC", category: "Departmental · Technology", advisor: "Dept. of EEE", members: 98, recruiting: false,
      desc: "Circuit-design contests, PCB workshops and industry-visit programs for EEE students." },
    { id: "C-14", name: "English Club", short: "EC", category: "Departmental · Language", advisor: "Dept. of English", members: 66, recruiting: true,
      desc: "Public-speaking practice, creative writing circles and English-language cultural events." },
    { id: "C-15", name: "Law Club", short: "LC", category: "Departmental · Law", advisor: "Dept. of Law", members: 84, recruiting: false,
      desc: "Moot court practice, legal-aid awareness camps and organiser of the annual Law Fest." },
    { id: "C-16", name: "Textile Club", short: "TC", category: "Departmental · Textile", advisor: "Dept. of Textile Engineering", members: 59, recruiting: true,
      desc: "Industry visits, fabric-design showcases and career sessions for Textile Engineering students." }
  ],

  activities: [
    { id: "A-001", clubId: "C-08", title: "Workshop: Line-following robot build", date: "2026-07-11", desc: "Hands-on microcontroller workshop, Robotics Lab, 3:00 PM." },
    { id: "A-002", clubId: "C-01", title: "Weekly parliamentary debate practice", date: "2026-07-10", desc: "Open practice round, Seminar Room 302, 4:00 PM." },
    { id: "A-003", clubId: "C-09", title: "Blood-group testing & donor sign-up", date: "2026-07-15", desc: "Donor awareness stall, Cafeteria corridor, 10:00 AM." },
    { id: "A-004", clubId: "C-06", title: "Rehearsal: Cultural Night", date: "2026-07-19", desc: "Full-cast rehearsal, Open Air Stage, 3:00 PM." },
    { id: "A-005", clubId: "C-07", title: "Inter-department badminton trials", date: "2026-07-13", desc: "Trials for the Autumn squad, Indoor Court, 10:00 AM." },
    { id: "A-006", clubId: "C-11", title: "Webinar: From Campus to Career", date: "2026-07-21", desc: "Job-readiness webinar for Green Business School students, online (MS Teams), 5:00 PM." },
    { id: "A-007", clubId: "C-12", title: "Workshop: Git & GitHub for beginners", date: "2026-07-24", desc: "Hands-on version-control workshop, Lab 4, 2:30 PM." },
    { id: "A-008", clubId: "C-02", title: "Campus tree-planting drive", date: "2026-07-17", desc: "Sapling planting along the Central Field walkway, 9:00 AM." },
    { id: "A-009", clubId: "C-04", title: "Photo walk: Monsoon on campus", date: "2026-07-20", desc: "Meet at the Main Gate, 4:00 PM." },
    { id: "A-010", clubId: "C-15", title: "Moot court practice round", date: "2026-07-14", desc: "Practice bench trial, Law Building Court Room, 3:00 PM." }
  ],

  applications: [
    { id: "AP-001", clubId: "C-12", name: "Nusrat Jahan", studentId: "231002015", dept: "Computer Science and Engineering", email: "nusrat15@student.green.edu.bd", date: "2026-07-01", status: "Pending" },
    { id: "AP-002", clubId: "C-09", name: "Tanvir Ahmed", studentId: "223015042", dept: "Electrical and Electronic Engineering", email: "tanvir42@student.green.edu.bd", date: "2026-07-03", status: "Pending" }
  ],

  events: [
    {
      id: "E-001", title: "Intra-University Blood Donation Camp", category: "Social",
      date: "2026-07-16", time: "09:00", venue: "Medical Centre Plaza",
      organizer: "Leo Club", capacity: 200,
      desc: "Half-yearly voluntary donation camp with free blood-group testing for all students and staff."
    },
    {
      id: "E-002", title: "GUB Cultural Night", category: "Cultural",
      date: "2026-07-30", time: "17:30", venue: "Open Air Stage",
      organizer: "Cultural Club", capacity: 400,
      desc: "An evening of songs, dance and drama, open to all departments."
    },
    {
      id: "E-003", title: "Career & Internship Fair 2026", category: "Career",
      date: "2026-08-09", time: "10:00", venue: "Multipurpose Hall",
      organizer: "Center for Career Development (CCD)", capacity: 600,
      desc: "Meet recruiters from software firms, banks and telecoms. Bring printed CVs and your student ID."
    },
    {
      id: "E-004", title: "GUB Indoor Games Festival 2026", category: "Festival",
      date: "2026-08-21", time: "09:00", venue: "Multipurpose Hall",
      organizer: "Sports Club", capacity: 300,
      desc: "Ludo, Carrom, Chess and Table Tennis — open to students, faculty and staff across a full day of play."
    },
    {
      id: "E-005", title: "Tech Carnival: Programming Contest", category: "Competition",
      date: "2026-09-12", time: "10:00", venue: "Lab 7 & Lab 8",
      organizer: "Computer Club", capacity: 120,
      desc: "Five-hour ICPC-style team contest. Teams of three; the top three teams receive prizes and certificates."
    }
  ],

  registrations: [
    { id: "REG-001", eventId: "E-004", name: "Sadia Rahman", studentId: "221002034", email: "sadia34@student.green.edu.bd", date: "2026-07-02" },
    { id: "REG-002", eventId: "E-001", name: "Mahmudul Hasan", studentId: "232015077", email: "mahmud77@student.green.edu.bd", date: "2026-07-03" }
  ]
};

/* ---------- storage helpers ---------- */

function dbLoad() {
  var db = null;
  try {
    var raw = localStorage.getItem(DB_KEY);
    if (raw) { db = JSON.parse(raw); }
  } catch (e) { /* corrupted or unavailable storage: fall through to seed */ }
  if (!db) {
    db = JSON.parse(JSON.stringify(GUB_SEED));
    dbSave(db);
    return db;
  }
  if (!Array.isArray(db.users)) { db.users = JSON.parse(JSON.stringify(GUB_SEED.users)); dbSave(db); }
  return db;
}

function dbSave(db, announce) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
  catch (e) { console.warn("Could not save to localStorage", e); }
  if (syncChannel) {
    try { syncChannel.postMessage({ ts: Date.now(), announce: announce || null }); }
    catch (e) { /* ignore */ }
  }
}

function dbReset() {
  try { localStorage.removeItem(DB_KEY); } catch (e) { /* ignore */ }
}

/* Sequential ID generator, e.g. nextId("R", routes, 2) -> "R-09" */
function nextId(prefix, list, pad) {
  var max = 0;
  for (var i = 0; i < list.length; i++) {
    var parts = String(list[i].id).split("-");
    var n = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(n) && n > max) { max = n; }
  }
  var num = String(max + 1);
  while (num.length < (pad || 2)) { num = "0" + num; }
  return prefix + "-" + num;
}
