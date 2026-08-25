// Correct code — create the account now (guard against a duplicate
// signed up from another tab while this code was pending).
var db = dbLoad();

for (var i = 0; i < db.users.length; i++) {
  if (db.users[i].email === pending.email) {
    toast("That email was just registered elsewhere — please log in instead.", true);
    stopOtpCountdown();

    try {
      sessionStorage.removeItem(PENDING_SIGNUP_KEY);
    } catch (e) {
      /* ignore */
    }

    closeModal("otp-modal");
    openModal("login-modal");
    return;
  }
}

// ============================================================
// CREATE THE EXISTING LOCAL USER RECORD
// ============================================================
var rec = {
  id: nextId("U", db.users, 3),
  name: pending.name,
  email: pending.email,
  studentId: pending.studentId,
  mobile: pending.mobile,
  password: pending.password,
  joined: todayISO()
};

// ============================================================
// KEEP EXISTING LOCALSTORAGE BEHAVIOR
// ============================================================
db.users.push(rec);
dbSave(db);


// ============================================================
// CREATE USER IN SUPABASE AUTH + PROFILES
// ============================================================
if (typeof sbClient !== "undefined" && sbClient) {

  sbClient.auth.signUp({
    email: pending.email,
    password: pending.password
  })
  .then(function (response) {

    if (response.error) {
      console.error(
        "[Supabase Auth] Failed to create user:",
        response.error
      );

      toast(
        "Account saved locally, but Supabase signup failed: " +
        response.error.message,
        true
      );

      return;
    }

    var authUser = response.data && response.data.user;

    if (!authUser) {
      console.error(
        "[Supabase Auth] No user returned after signup."
      );

      return;
    }

    // ========================================================
    // INSERT USER INFORMATION INTO public.profiles
    // ========================================================
    return sbClient
      .from("profiles")
      .insert([
        {
          id: authUser.id,
          name: pending.name,
          student_id: pending.studentId,
          mobile: pending.mobile
        }
      ])
      .then(function (profileResponse) {

        if (profileResponse.error) {
          console.error(
            "[Supabase Profiles] Failed to save profile:",
            profileResponse.error
          );

          toast(
            "Supabase account created, but profile could not be saved.",
            true
          );

          return;
        }

        console.log(
          "[Supabase] User profile successfully saved:",
          pending.email
        );

      });

  })
  .catch(function (error) {

    console.error(
      "[Supabase] Unexpected signup error:",
      error
    );

    toast(
      "Account saved locally, but Supabase could not be reached.",
      true
    );

  });
}


// ============================================================
// REST OF YOUR ORIGINAL CODE — UNCHANGED
// ============================================================

stopOtpCountdown();

try {
  sessionStorage.removeItem(PENDING_SIGNUP_KEY);
} catch (e) {
  /* ignore */
}

try {
  sessionStorage.setItem(SESSION_KEY, rec.id);
} catch (e) {
  /* ignore */
}

otpForm.reset();
closeModal("otp-modal");
renderAuthArea();

toast(
  "Verified — welcome, " +
  String(rec.name).split(" ")[0] +
  "!"
);

if (pendingAction) {
  var fn = pendingAction;
  pendingAction = null;
  fn();
} else if (!/dashboard\.html$/.test(location.pathname)) {
  location.href = "dashboard.html";
}