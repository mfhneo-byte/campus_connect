/* ============================================================
   GUB Campus Connect — account system (demo only)

   Sign-up now runs through a one-time-passcode (OTP) step before the
   account is actually created, and a successful verification logs the
   person straight into their new account and sends them to the
   dashboard. Logging in starts a session in sessionStorage — not
   localStorage — on purpose: it clears when the browser tab/window is
   closed, so a new visit always needs a fresh login, while the account
   itself is remembered permanently.

   OTP delivery is SIMULATED: there's no backend in this project to send
   real email, so the code is shown right in the verification modal,
   clearly labelled as a demo. To send a real email instead, replace the
   body of deliverOTP() below with a call to an email API that works
   from client-side JS with no backend — e.g. EmailJS (see README) —
   and nothing else in this file needs to change.

   Passwords are stored in plain text alongside everything else. That's
   fine for demo data typed into a school project, but it is not real
   security — never reuse a real password here.
   ============================================================ */

var SESSION_KEY = "gubcc_session";
var PENDING_SIGNUP_KEY = "gubcc_pending_signup"; // sessionStorage — cleared on tab close
var OTP_TTL_MS = 5 * 60 * 1000;
var OTP_MAX_ATTEMPTS = 5;

var pendingAction = null; // callback to run automatically right after a successful login/verification
var otpTimerHandle = null;

/* ---------- OTP delivery: real email (EmailJS) or on-screen demo ----------
   If js/email-config.js has all three values filled in, the EmailJS SDK is
   loaded from its CDN and codes are genuinely emailed. Otherwise — or if
   loading/sending fails at runtime — the code is shown in the modal so the
   flow always completes. */
var emailReady = null; // Promise when real delivery is configured, else null

function initEmailDelivery() {
  var cfg = window.GUBCC_EMAIL_CONFIG || {};
  if (!cfg.publicKey || !cfg.serviceId || !cfg.templateId) { return; }
  emailReady = new Promise(function (resolve, reject) {
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
    s.onload = function () {
      try {
        window.emailjs.init({ publicKey: cfg.publicKey });
        resolve();
      } catch (e) { reject(e); }
    };
    s.onerror = function () { reject(new Error("EmailJS SDK failed to load")); };
    document.head.appendChild(s);
  });
}

function sendOtpEmail(toEmail, toName, code) {
  var cfg = window.GUBCC_EMAIL_CONFIG || {};
  return emailReady.then(function () {
    return window.emailjs.send(cfg.serviceId, cfg.templateId, {
      to_email: toEmail,
      to_name: toName,
      code: code
    });
  });
}

function currentUser() {
  var db = dbLoad();
  var uid = null;
  try { uid = sessionStorage.getItem(SESSION_KEY); } catch (e) { /* ignore */ }
  if (!uid) { return null; }
  for (var i = 0; i < db.users.length; i++) {
    if (db.users[i].id === uid) { return db.users[i]; }
  }
  return null;
}

/* Run fn immediately if someone is logged in; otherwise remember fn,
   open the login modal, and run fn automatically right after they log in
   (including if they detour through Sign up + OTP verification first). */
function requireLogin(fn) {
  if (currentUser()) { fn(); return; }
  pendingAction = fn;
  toast("Log in first to use this — it only takes a moment.");
  openModal("login-modal");
}

function renderAuthArea() {
  var area = document.getElementById("auth-area");
  if (!area) { return; }
  var user = currentUser();
  if (user) {
    var firstName = String(user.name).split(" ")[0];
    area.innerHTML =
      '<a class="auth-user" href="dashboard.html">Hi, ' + esc(firstName) + "</a>" +
      '<button class="btn ghost small" id="nav-logout" type="button">Log out</button>';
  } else {
    area.innerHTML =
      '<button class="btn ghost small" id="nav-login" type="button">Log in</button>' +
      '<button class="btn primary small" id="nav-signup" type="button">Sign up</button>';
  }
}

/* ---------- OTP: generate + deliver + countdown ---------- */

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function stopOtpCountdown() {
  if (otpTimerHandle) { clearInterval(otpTimerHandle); otpTimerHandle = null; }
}

function startOtpCountdown(expiresAt) {
  var el = document.getElementById("otp-timer");
  var resend = document.getElementById("otp-resend");
  stopOtpCountdown();
  function tick() {
    var remain = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
    if (el) {
      var m = Math.floor(remain / 60), s = remain % 60;
      el.textContent = remain > 0
        ? "Code expires in " + m + ":" + (s < 10 ? "0" : "") + s
        : "Code expired — request a new one below.";
      el.classList.toggle("expired", remain <= 0);
    }
    if (resend) { resend.style.opacity = remain <= 0 ? "1" : "0.55"; }
    if (remain <= 0) { stopOtpCountdown(); }
  }
  tick();
  otpTimerHandle = setInterval(tick, 1000);
}

function beginSignupOtp(pending) {
  var code = generateOTP();
  var record = {
    name: pending.name, email: pending.email, studentId: pending.studentId,
    mobile: pending.mobile, password: pending.password,
    code: code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0
  };
  try { sessionStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(record)); } catch (e) { /* ignore */ }

  var realMode = !!emailReady;
  var targetEl = document.getElementById("otp-target");
  var demoBox = document.getElementById("otp-demo-box");
  var demoEl = document.getElementById("otp-demo-value");
  var codeInput = document.getElementById("otp-code");

  function showDemoCode() {
    if (demoBox) { demoBox.style.display = ""; }
    if (demoEl) { demoEl.textContent = code; }
  }

  if (realMode) {
    if (demoBox) { demoBox.style.display = "none"; }
    if (demoEl) { demoEl.textContent = ""; }
    if (targetEl) { targetEl.innerHTML = "Sending a 6-digit code to <strong>" + esc(pending.email) + "</strong>…"; }
    sendOtpEmail(pending.email, pending.name, code)
      .then(function () {
        if (targetEl) { targetEl.innerHTML = "We've emailed a 6-digit code to <strong>" + esc(pending.email) + "</strong> — check your inbox (and spam folder)."; }
      })
      .catch(function (err) {
        console.warn("OTP email failed; falling back to on-screen code.", err);
        toast("Couldn't send the email — showing your code here instead.", true);
        if (targetEl) { targetEl.innerHTML = "Email delivery failed, so here's your code for <strong>" + esc(pending.email) + "</strong>:"; }
        showDemoCode();
      });
  } else {
    if (targetEl) { targetEl.innerHTML = "Demo mode — your code for <strong>" + esc(pending.email) + "</strong> is shown below."; }
    showDemoCode();
  }

  if (codeInput) { codeInput.value = ""; }

  startOtpCountdown(record.expiresAt);
  openModal("otp-modal");
}

function readPendingSignup() {
  try {
    var raw = sessionStorage.getItem(PENDING_SIGNUP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

document.addEventListener("DOMContentLoaded", function () {
  initEmailDelivery();
  renderAuthArea();

  document.addEventListener("click", function (ev) {
    var t = ev.target;
    if (t.id === "nav-login") { openModal("login-modal"); }
    if (t.id === "nav-signup") { openModal("signup-modal"); }
    if (t.id === "nav-logout") {
      try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
      renderAuthArea();
      toast("You're logged out.");
    }
    if (t.id === "signup-goto-login") { closeModal("signup-modal"); openModal("login-modal"); }
    if (t.id === "login-goto-signup") { closeModal("login-modal"); openModal("signup-modal"); }
    if (t.id === "signup-cancel") { pendingAction = null; closeModal("signup-modal"); }
    if (t.id === "login-cancel") { pendingAction = null; closeModal("login-modal"); }
    if (t.id === "otp-cancel") {
      pendingAction = null;
      stopOtpCountdown();
      try { sessionStorage.removeItem(PENDING_SIGNUP_KEY); } catch (e) { /* ignore */ }
      closeModal("otp-modal");
    }
    if (t.id === "otp-resend") {
      ev.preventDefault();
      var pending = readPendingSignup();
      if (!pending) {
        toast("Nothing to resend — please sign up again.", true);
        closeModal("otp-modal"); openModal("signup-modal");
        return;
      }
      beginSignupOtp(pending);
      toast("New code sent.");
    }
  });

  /* ---------- Sign up: validate, then move to OTP instead of creating the account yet ---------- */
  var signupForm = document.getElementById("signup-form");
  if (signupForm) {
    signupForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var db = dbLoad();
      var name = document.getElementById("signup-name").value.trim();
      var email = document.getElementById("signup-email").value.trim().toLowerCase();
      var sid = document.getElementById("signup-sid").value.trim();
      var mobile = document.getElementById("signup-mobile").value.trim();
      var password = document.getElementById("signup-password").value;

      if (!name || !email || !sid || !mobile || !password) {
        toast("Fill in every field to create an account.", true);
        return;
      }
      if (!/^[0-9]{9}$/.test(sid)) {
        toast("ID must be a 9-digit student ID, e.g. 231002015.", true);
        return;
      }
      if (!/^01[3-9][0-9]{8}$/.test(mobile)) {
        toast("Mobile number must be an 11-digit BD number, e.g. 01712345678.", true);
        return;
      }
      if (password.length < 6) {
        toast("Password must be at least 6 characters.", true);
        return;
      }
      for (var i = 0; i < db.users.length; i++) {
        if (db.users[i].email === email) {
          toast("An account with that email already exists — log in instead.", true);
          return;
        }
      }

      signupForm.reset();
      closeModal("signup-modal");
      beginSignupOtp({ name: name, email: email, studentId: sid, mobile: mobile, password: password });
    });
  }

  /* ---------- OTP verify: on success, actually create the account and log in ---------- */
  var otpForm = document.getElementById("otp-form");
  if (otpForm) {
    otpForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var pending = readPendingSignup();
      if (!pending) {
        toast("Your sign-up session expired — please sign up again.", true);
        stopOtpCountdown();
        closeModal("otp-modal"); openModal("signup-modal");
        return;
      }
      var entered = document.getElementById("otp-code").value.trim();

      if (Date.now() > pending.expiresAt) {
        toast("That code expired. Tap \u201cResend code\u201d for a new one.", true);
        return;
      }
      if (entered !== pending.code) {
        pending.attempts = (pending.attempts || 0) + 1;
        if (pending.attempts >= OTP_MAX_ATTEMPTS) {
          toast("Too many incorrect attempts — please sign up again.", true);
          stopOtpCountdown();
          try { sessionStorage.removeItem(PENDING_SIGNUP_KEY); } catch (e) { /* ignore */ }
          closeModal("otp-modal"); openModal("signup-modal");
          return;
        }
        try { sessionStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(pending)); } catch (e) { /* ignore */ }
        toast("That code doesn't match (" + (OTP_MAX_ATTEMPTS - pending.attempts) + " attempt(s) left).", true);
        return;
      }

      // Correct code — create the account now (guard against a duplicate
      // signed up from another tab while this code was pending).
      var db = dbLoad();
      for (var i = 0; i < db.users.length; i++) {
        if (db.users[i].email === pending.email) {
          toast("That email was just registered elsewhere — please log in instead.", true);
          stopOtpCountdown();
          try { sessionStorage.removeItem(PENDING_SIGNUP_KEY); } catch (e) { /* ignore */ }
          closeModal("otp-modal"); openModal("login-modal");
          return;
        }
      }
      var rec = {
        id: nextId("U", db.users, 3), name: pending.name, email: pending.email,
        studentId: pending.studentId, mobile: pending.mobile, password: pending.password,
        joined: todayISO()
      };
      db.users.push(rec);
      dbSave(db);
      stopOtpCountdown();
      try { sessionStorage.removeItem(PENDING_SIGNUP_KEY); } catch (e) { /* ignore */ }
      try { sessionStorage.setItem(SESSION_KEY, rec.id); } catch (e) { /* ignore */ }

      otpForm.reset();
      closeModal("otp-modal");
      renderAuthArea();
      toast("Verified — welcome, " + String(rec.name).split(" ")[0] + "!");

      if (pendingAction) {
        var fn = pendingAction;
        pendingAction = null;
        fn();
      } else if (!/dashboard\.html$/.test(location.pathname)) {
        location.href = "dashboard.html";
      }
    });

    // digits-only, 6-char cap, for a nicer typing feel
    var otpCodeInput = document.getElementById("otp-code");
    if (otpCodeInput) {
      otpCodeInput.addEventListener("input", function () {
        otpCodeInput.value = otpCodeInput.value.replace(/[^0-9]/g, "").slice(0, 6);
      });
    }
  }

  /* ---------- Log in: unchanged, no OTP for existing accounts ---------- */
  var loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var db = dbLoad();
      var email = document.getElementById("login-email").value.trim().toLowerCase();
      var password = document.getElementById("login-password").value;

      var match = null;
      for (var i = 0; i < db.users.length; i++) {
        if (db.users[i].email === email && db.users[i].password === password) { match = db.users[i]; break; }
      }
      if (!match) {
        toast("Email or password is incorrect.", true);
        return;
      }
      try { sessionStorage.setItem(SESSION_KEY, match.id); } catch (e) { /* ignore */ }
      loginForm.reset();
      closeModal("login-modal");
      renderAuthArea();
      toast("Welcome back, " + String(match.name).split(" ")[0] + ".");

      if (pendingAction) {
        var fn = pendingAction;
        pendingAction = null;
        fn();
      }
    });
  }
});
