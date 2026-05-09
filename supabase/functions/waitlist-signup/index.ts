import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type WaitlistSignupStatus = "created" | "duplicate";

type SendEmailResult = {
  ok: boolean;
  id?: string | null;
  error?: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function envTrimmed(name: string): string {
  return (Deno.env.get(name) ?? "").trim();
}

function resolveAdminRecipients(): string[] {
  const raw = envTrimmed("WAITLIST_ADMIN_EMAILS") || envTrimmed("ADMIN_EMAIL") || "lustforgeapp@gmail.com";
  return raw
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SITE_URL = "https://www.lustforge.app";

/** Dark neon LustForge shell — table layout + inline styles for email clients. */
function emailShell(args: { preheader: string; title: string; innerHtml: string }): string {
  const pre = escapeHtml(args.preheader);
  const title = escapeHtml(args.title);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0c;font-family:Georgia,'Times New Roman',serif;-webkit-font-smoothing:antialiased;">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;color:transparent;overflow:hidden;">${pre}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0a0a0c;background:linear-gradient(180deg,#0a0a0c 0%,#120818 55%,#0a0a0c 100%);">
    <tr>
      <td align="center" style="padding:32px 16px 48px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
          <tr>
            <td align="center" style="padding-bottom:20px;">
              <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:0.06em;color:#FF2D7B;text-shadow:0 0 24px rgba(255,45,123,0.35);">LUSTFORGE</p>
              <p style="margin:6px 0 0;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#71767b;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">AI companions · 18+</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#111116;border:1px solid rgba(255,45,123,0.28);border-radius:20px;overflow:hidden;box-shadow:0 0 40px rgba(255,45,123,0.08),inset 0 1px 0 rgba(255,255,255,0.06);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="height:3px;background:linear-gradient(90deg,#FF2D7B 0%,#5b21b6 50%,#FF2D7B 100%);background-color:#FF2D7B;"></td>
                </tr>
                <tr>
                  <td style="padding:28px 28px 32px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e7e9ea;">
                    ${args.innerHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 8px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;line-height:1.6;color:#71767b;">
              <p style="margin:0 0 8px;"><a href="${SITE_URL}" style="color:#1d9bf0;text-decoration:none;">lustforge.app</a></p>
              <p style="margin:0;">You received this because of activity on the LustForge waitlist.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendResendEmail(args: {
  apiKey: string;
  from: string;
  to: string | string[];
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: args.from,
        to: args.to,
        subject: args.subject,
        html: args.html,
      }),
    });

    const raw = await r.text();
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    if (!r.ok) {
      const msg =
        (parsed && typeof parsed === "object" && typeof (parsed as { message?: unknown }).message === "string"
          ? String((parsed as { message?: unknown }).message)
          : raw || `Resend HTTP ${r.status}`) ?? `Resend HTTP ${r.status}`;
      return { ok: false, error: msg.slice(0, 600) };
    }

    const id =
      parsed && typeof parsed === "object" && typeof (parsed as { id?: unknown }).id === "string"
        ? String((parsed as { id?: unknown }).id)
        : null;
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function adminHtml(email: string, status: WaitlistSignupStatus): string {
  const safeEmail = escapeHtml(email);
  const isNew = status === "created";
  const badgeBg = isNew ? "rgba(255,45,123,0.2)" : "rgba(113,118,123,0.25)";
  const badgeColor = isNew ? "#FF8FB8" : "#b0b5ba";
  const badgeText = isNew ? "NEW SIGNUP" : "DUPLICATE";
  const headline = isNew ? "Someone joined the waitlist" : "Duplicate waitlist attempt";
  const iso = escapeHtml(new Date().toISOString());
  const inner = `
    <p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:#FF2D7B;">Command · Waitlist</p>
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;line-height:1.25;color:#f7f9f9;">${headline}</h1>
    <p style="margin:0 0 20px;">
      <span style="display:inline-block;padding:6px 12px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:0.12em;background-color:${badgeBg};color:${badgeColor};">${badgeText}</span>
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0a0a0b;border:1px solid rgba(255,255,255,0.08);border-radius:12px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#71767b;">Subscriber email</p>
          <p style="margin:0;font-size:15px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;word-break:break-all;color:#1d9bf0;">${safeEmail}</p>
        </td>
      </tr>
    </table>
    <p style="margin:18px 0 0;font-size:13px;color:#8b98a5;line-height:1.5;">
      <strong style="color:#c4cdd4;">Recorded (UTC):</strong> ${iso}<br>
      <strong style="color:#c4cdd4;">Row status:</strong> ${status === "created" ? "Inserted" : "Already existed (unique email)"}
    </p>
    <p style="margin:20px 0 0;font-size:13px;line-height:1.55;color:#b8c0c8;">
      Check the <strong style="color:#e7e9ea;">Admin → Waitlist</strong> table for the full list and exports.
    </p>
  `;
  return emailShell({
    preheader: `${isNew ? "New" : "Duplicate"} waitlist: ${email}`,
    title: "LustForge · Waitlist alert",
    innerHtml: inner,
  });
}

function confirmationHtml(email: string, status: WaitlistSignupStatus): string {
  const safeEmail = escapeHtml(email);
  const isNew = status === "created";
  const headline = isNew ? "You are officially on the list" : "You are still on the list";
  const sub = isNew
    ? "Thanks for raising your hand. We will email you when the gates open and early access is ready."
    : "This address was already on our waitlist — no need to sign up again. We will still keep you in the loop when we launch.";
  const inner = `
    <p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:#FF2D7B;">Waitlist confirmed</p>
    <h1 style="margin:0 0 14px;font-size:24px;font-weight:700;line-height:1.3;color:#f7f9f9;">${headline}</h1>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.55;color:#c4cdd4;">${sub}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0a0a0b;border:1px solid rgba(255,45,123,0.2);border-radius:12px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#71767b;">Your email</p>
          <p style="margin:0;font-size:15px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;word-break:break-all;color:#e7e9ea;">${safeEmail}</p>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:14px;line-height:1.55;color:#8b98a5;">
      — The LustForge team
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 0;">
      <tr>
        <td style="border-radius:10px;background:linear-gradient(90deg,#FF2D7B,#5b21b6);background-color:#FF2D7B;">
          <a href="${SITE_URL}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Visit lustforge.app</a>
        </td>
      </tr>
    </table>
  `;
  return emailShell({
    preheader: isNew ? "You are on the LustForge waitlist." : "You are still on the LustForge waitlist.",
    title: "LustForge · Waitlist",
    innerHtml: inner,
  });
}

async function logEmailEvent(args: {
  admin: ReturnType<typeof createClient>;
  email: string;
  signupStatus: WaitlistSignupStatus;
  adminResult: SendEmailResult;
  confirmationResult: SendEmailResult;
}) {
  const { error } = await args.admin.from("waitlist_email_events").insert([
    {
      waitlist_email: args.email,
      signup_status: args.signupStatus,
      admin_delivery_ok: args.adminResult.ok,
      admin_message_id: args.adminResult.id ?? null,
      admin_error: args.adminResult.error ?? null,
      confirmation_delivery_ok: args.confirmationResult.ok,
      confirmation_message_id: args.confirmationResult.id ?? null,
      confirmation_error: args.confirmationResult.error ?? null,
      provider: "resend",
    },
  ]);
  if (error) {
    console.error("[waitlist-signup] event_log_failed", {
      email: args.email,
      signupStatus: args.signupStatus,
      message: error.message,
      code: error.code,
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = envTrimmed("SUPABASE_URL");
  const serviceRoleKey = envTrimmed("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = envTrimmed("RESEND_API_KEY");
  const waitlistFrom = envTrimmed("WAITLIST_EMAIL_FROM");
  const adminRecipients = resolveAdminRecipients();

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "Server misconfigured: Supabase credentials missing." });
  }
  if (!resendApiKey || !waitlistFrom) {
    return json(500, { error: "Server misconfigured: waitlist email env vars missing." });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }
  const email = String((body as { email?: unknown })?.email ?? "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return json(400, { error: "Valid email is required." });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  let status: WaitlistSignupStatus = "created";
  const { error: insertError } = await admin.from("waitlist").insert([{ email }]);
  if (insertError) {
    if (insertError.code === "23505") {
      status = "duplicate";
    } else {
      console.error("[waitlist-signup] insert_failed", {
        email,
        code: insertError.code,
        message: insertError.message,
      });
      return json(500, { error: "Could not save waitlist signup.", details: insertError.message });
    }
  }

  const adminSend = await sendResendEmail({
    apiKey: resendApiKey,
    from: waitlistFrom,
    to: adminRecipients,
    subject: status === "created" ? `New Waitlist Signup: ${email}` : `Waitlist Duplicate Signup: ${email}`,
    html: adminHtml(email, status),
  });
  const confirmationSend = await sendResendEmail({
    apiKey: resendApiKey,
    from: waitlistFrom,
    to: email,
    subject:
      status === "created"
        ? "You are on the LustForge waitlist"
        : "You are still on the LustForge waitlist",
    html: confirmationHtml(email, status),
  });

  const emailFailed = !adminSend.ok || !confirmationSend.ok;
  if (emailFailed) {
    console.error("[waitlist-signup] email_send_failed", {
      email,
      status,
      adminOk: adminSend.ok,
      adminError: adminSend.error ?? null,
      adminMessageId: adminSend.id ?? null,
      confirmationOk: confirmationSend.ok,
      confirmationError: confirmationSend.error ?? null,
      confirmationMessageId: confirmationSend.id ?? null,
    });
  } else {
    console.log("[waitlist-signup] email_sent", {
      email,
      status,
      adminMessageId: adminSend.id ?? null,
      confirmationMessageId: confirmationSend.id ?? null,
    });
  }
  await logEmailEvent({
    admin,
    email,
    signupStatus: status,
    adminResult: adminSend,
    confirmationResult: confirmationSend,
  });

  return json(200, {
    status,
    email_status: emailFailed ? "email_failed" : "email_sent",
    inserted: status === "created",
    admin_notified: adminSend.ok,
    confirmation_sent: confirmationSend.ok,
  });
});
