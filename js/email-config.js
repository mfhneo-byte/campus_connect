/* ============================================================
   Real OTP email delivery — OPTIONAL configuration

   Out of the box, the sign-up code is shown on screen ("demo mode")
   because a static site has no email server. To send REAL emails,
   create a free EmailJS account (https://www.emailjs.com — 200
   emails/month free, sends from client-side JS, no backend) and
   fill in the three values below. Full step-by-step instructions
   are in README.md under "Sending a real OTP email".

   - publicKey : EmailJS dashboard → Account → General → Public Key
   - serviceId : EmailJS dashboard → Email Services → your service
   - templateId: EmailJS dashboard → Email Templates → your template
                 (the template must use {{code}} in its body and have
                  its "To Email" field set to {{to_email}})

   Leave all three empty ("") to stay in demo mode. If sending ever
   fails at runtime (bad values, quota exhausted, network down), the
   app automatically falls back to showing the code on screen so the
   sign-up flow never gets stuck.

   Note: an EmailJS public key is designed to ship in client-side
   code, but that also means anyone can read it in your page source.
   Acceptable for a lab project; a production system would send OTP
   from a server instead.
   ============================================================ */

window.GUBCC_EMAIL_CONFIG = {
  publicKey: "8Sw99lrC9mqK6y_xF",
  serviceId: "service_7xur1bk",
  templateId: "template_gflrx6i"
};
