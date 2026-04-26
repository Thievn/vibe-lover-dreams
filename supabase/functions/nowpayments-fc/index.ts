import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireSessionUser } from "../_shared/requireSessionUser.ts";
import { recordFcTransaction } from "../_shared/recordFcTransaction.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-nowpayments-sig",
};

type Pack = { id: string; usd: number; fc: number; label: string; badge: string };
const PACKS: Pack[] = [
  { id: "starter_750", usd: 5, fc: 750, label: "$5 - 750 FC", badge: "Starter" },
  { id: "popular_1650", usd: 10, fc: 1650, label: "$10 - 1,650 FC", badge: "Popular" },
  { id: "best_4500", usd: 25, fc: 4500, label: "$25 - 4,500 FC", badge: "Best Value" },
  { id: "heavy_9500", usd: 50, fc: 9500, label: "$50 - 9,500 FC", badge: "Heavy User" },
];

function getNowPaymentsKey(): string {
  const key = Deno.env.get("NOWPAYMENTS_API_KEY")?.trim();
  if (!key) throw new Error("NOWPAYMENTS_API_KEY is missing in function secrets.");
  return key;
}

function getNowPaymentsIpnSecret(): string {
  const key = Deno.env.get("NOWPAYMENTS_IPN_SECRET")?.trim();
  if (!key) throw new Error("NOWPAYMENTS_IPN_SECRET is missing in function secrets.");
  return key;
}

function publicSiteUrl(): string {
  return (Deno.env.get("PUBLIC_SITE_URL")?.trim() || "https://lustforge.app").replace(/\/$/, "");
}

function json(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function findPack(packId: string): Pack | undefined {
  return PACKS.find((p) => p.id === packId);
}

async function nowFetch(path: string, payload: Record<string, unknown>) {
  const key = getNowPaymentsKey();
  const res = await fetch(`https://api.nowpayments.io/v1${path}`, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`NOWPayments ${path} failed (${res.status}): ${JSON.stringify(parsed).slice(0, 300)}`);
  }
  return parsed as Record<string, unknown>;
}

async function hmacSha512Hex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyIpn(rawBody: string, signature: string): Promise<boolean> {
  const secret = getNowPaymentsIpnSecret();
  const expected = await hmacSha512Hex(secret, rawBody);
  return expected.toLowerCase() === signature.toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return json(500, { error: "Server misconfigured" });
  const svc = createClient(supabaseUrl, serviceKey);

  try {
    const rawBody = await req.text();
    const body = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
    const mode = typeof body.mode === "string" ? body.mode : "";

    if (mode === "packs") {
      return json(200, { packs: PACKS });
    }

    if (mode === "webhook") {
      const sig = req.headers.get("x-nowpayments-sig")?.trim() || "";
      if (!sig || !(await verifyIpn(rawBody, sig))) {
        return json(401, { error: "Invalid NOWPayments webhook signature" });
      }
      const paymentId = String(body.payment_id ?? "").trim();
      const paymentStatus = String(body.payment_status ?? "").trim().toLowerCase();
      if (!paymentId) return json(400, { error: "payment_id missing" });

      const { data: existing, error: findErr } = await svc
        .from("fc_purchase_orders")
        .select("*")
        .eq("nowpayments_payment_id", paymentId)
        .maybeSingle();
      if (findErr || !existing) return json(404, { error: "Order not found for payment_id" });

      const order = existing as Record<string, unknown>;
      const userId = String(order.user_id ?? "");
      const fcAmount = Number(order.fc_amount ?? 0);
      const alreadyCompleted = String(order.payment_status ?? "") === "completed";
      const isCompleted = ["finished", "confirmed", "sending"].includes(paymentStatus);
      const isFailed = ["failed", "expired", "refunded"].includes(paymentStatus);
      const nextStatus = isCompleted ? "completed" : isFailed ? paymentStatus : "pending";

      await svc
        .from("fc_purchase_orders")
        .update({
          payment_status: nextStatus,
          payment_method: String(body.pay_currency ?? order.payment_method ?? ""),
          pay_currency: String(body.pay_currency ?? order.pay_currency ?? ""),
          pay_amount: Number(body.pay_amount ?? order.pay_amount ?? 0) || null,
          webhook_payload: body,
          completed_at: isCompleted ? new Date().toISOString() : order.completed_at ?? null,
          failed_at: isFailed ? new Date().toISOString() : order.failed_at ?? null,
        })
        .eq("id", String(order.id));

      if (isCompleted && !alreadyCompleted && userId && fcAmount > 0) {
        const { data: profile } = await svc
          .from("profiles")
          .select("tokens_balance")
          .eq("user_id", userId)
          .maybeSingle();
        const current = Number(profile?.tokens_balance ?? 0);
        const next = current + fcAmount;
        await svc.from("profiles").update({ tokens_balance: next }).eq("user_id", userId);
        await recordFcTransaction(svc, {
          userId,
          creditsChange: fcAmount,
          balanceAfter: next,
          transactionType: "fc_purchase",
          description: `NOWPayments credit purchase (${order.pack_id ?? "pack"})`,
          metadata: {
            nowpayments_payment_id: paymentId,
            nowpayments_order_id: String(order.nowpayments_order_id ?? ""),
            order_id: String(order.id ?? ""),
          },
        });
      }
      return json(200, { ok: true });
    }

    const session = await requireSessionUser(req);
    if ("response" in session) return session.response;

    if (mode === "create_invoice") {
      const packId = String(body.packId ?? "").trim();
      const payCurrencyRaw = String(body.payCurrency ?? "").trim().toLowerCase();
      const payCurrency = payCurrencyRaw || undefined;
      const pack = findPack(packId);
      if (!pack) return json(400, { error: "Invalid credit pack." });

      const orderId = crypto.randomUUID();
      const site = publicSiteUrl();
      const webhookPath = `${supabaseUrl}/functions/v1/nowpayments-fc`;
      const invoicePayload: Record<string, unknown> = {
        price_amount: pack.usd,
        price_currency: "usd",
        order_id: orderId,
        order_description: `${pack.label} on LustForge`,
        ipn_callback_url: webhookPath,
        success_url: `${site}/buy-credits?status=success&order=${orderId}`,
        cancel_url: `${site}/buy-credits?status=cancelled&order=${orderId}`,
      };
      if (payCurrency) invoicePayload.pay_currency = payCurrency;

      const invoice = await nowFetch("/invoice", invoicePayload);
      const nowPaymentId = String(invoice.id ?? "");
      const invoiceUrl = String(invoice.invoice_url ?? "");

      const { error: insertErr } = await svc.from("fc_purchase_orders").insert({
        id: orderId,
        user_id: session.user.id,
        pack_id: pack.id,
        usd_amount: pack.usd,
        fc_amount: pack.fc,
        payment_status: "pending",
        nowpayments_payment_id: nowPaymentId || null,
        nowpayments_order_id: String(invoice.order_id ?? orderId),
        invoice_url: invoiceUrl || null,
        payment_method: payCurrency ?? null,
        pay_currency: String(invoice.pay_currency ?? payCurrency ?? ""),
        pay_amount: Number(invoice.pay_amount ?? 0) || null,
        webhook_payload: invoice,
      });
      if (insertErr) return json(400, { error: insertErr.message });

      return json(200, {
        ok: true,
        orderId,
        checkoutUrl: invoiceUrl,
        paymentId: nowPaymentId,
      });
    }

    if (mode === "payment_history") {
      const { data, error } = await svc
        .from("fc_purchase_orders")
        .select("id,pack_id,usd_amount,fc_amount,payment_status,payment_method,invoice_url,created_at,updated_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) return json(400, { error: error.message });
      return json(200, { rows: data ?? [] });
    }

    if (mode === "reset_payment_history") {
      const scopeRaw = String(body.scope ?? "pending").trim().toLowerCase();
      const scope = scopeRaw === "all" ? "all" : "pending";
      let q = svc.from("fc_purchase_orders").delete().eq("user_id", session.user.id);
      if (scope === "pending") {
        q = q.eq("payment_status", "pending");
      }
      const { data, error } = await q.select("id");
      if (error) return json(400, { error: error.message });
      return json(200, { ok: true, deleted: Array.isArray(data) ? data.length : 0, scope });
    }

    if (mode === "order_status") {
      const orderId = String(body.orderId ?? "").trim();
      if (!orderId) return json(400, { error: "orderId required" });
      const { data, error } = await svc
        .from("fc_purchase_orders")
        .select("id,payment_status,fc_amount,pack_id,created_at,updated_at")
        .eq("id", orderId)
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (error || !data) return json(404, { error: "Order not found" });
      const { data: profile } = await svc
        .from("profiles")
        .select("tokens_balance")
        .eq("user_id", session.user.id)
        .maybeSingle();
      return json(200, {
        order: data,
        balance: Number(profile?.tokens_balance ?? 0),
      });
    }

    return json(400, {
      error: "Invalid mode",
      valid: ["packs", "create_invoice", "payment_history", "order_status", "reset_payment_history", "webhook"],
    });
  } catch (err) {
    console.error("nowpayments-fc:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return json(500, { error: msg });
  }
});
