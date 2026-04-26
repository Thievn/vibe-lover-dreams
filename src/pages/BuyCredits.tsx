import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Coins, CreditCard, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import ParticleBackground from "@/components/ParticleBackground";
import { supabase } from "@/integrations/supabase/client";
import {
  createFcInvoice,
  fetchFcOrderStatus,
  fetchFcPacks,
  fetchFcPaymentHistory,
  resetFcPaymentHistory,
  type FcOrderRow,
  type FcPack,
} from "@/lib/nowpaymentsFcClient";
import { cn } from "@/lib/utils";

const NEON = "#FF2D7B";

function statusTone(status: FcOrderRow["payment_status"]) {
  if (status === "completed") return "text-emerald-300 border-emerald-400/30 bg-emerald-500/10";
  if (status === "pending") return "text-amber-200 border-amber-300/30 bg-amber-400/10";
  return "text-rose-300 border-rose-300/30 bg-rose-500/10";
}

export default function BuyCredits() {
  const [searchParams] = useSearchParams();
  const [packs, setPacks] = useState<FcPack[]>([]);
  const [orders, setOrders] = useState<FcOrderRow[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [selectedPackId, setSelectedPackId] = useState<string>("popular_1650");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "crypto">("card");
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);

  const activePack = useMemo(
    () => packs.find((p) => p.id === selectedPackId) ?? packs[0] ?? null,
    [packs, selectedPackId],
  );

  const refreshBaseData = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) return;

    const [{ data: profile }, packsData, historyData] = await Promise.all([
      supabase.from("profiles").select("tokens_balance").eq("user_id", sessionData.session.user.id).maybeSingle(),
      fetchFcPacks(),
      fetchFcPaymentHistory(),
    ]);
    setBalance(Number(profile?.tokens_balance ?? 0));
    setPacks(packsData);
    setOrders(historyData);
    if (!selectedPackId && packsData[0]) setSelectedPackId(packsData[0].id);
  };

  useEffect(() => {
    void (async () => {
      try {
        await refreshBaseData();
      } catch (e) {
        console.error(e);
        toast.error("Could not load credit store right now.");
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const status = searchParams.get("status");
    const order = searchParams.get("order");
    if (status === "success" && order) {
      toast.success("Payment submitted. Verifying confirmation...");
      setPolling(true);
      let tries = 0;
      const timer = setInterval(async () => {
        tries += 1;
        try {
          const res = await fetchFcOrderStatus(order);
          setBalance(res.balance);
          if (res.status === "completed") {
            clearInterval(timer);
            setPolling(false);
            toast.success("Forge Coins credited to your balance.");
            await refreshBaseData();
            return;
          }
          if (["failed", "expired", "refunded"].includes(res.status)) {
            clearInterval(timer);
            setPolling(false);
            toast.error(`Payment ${res.status}.`);
            await refreshBaseData();
            return;
          }
        } catch (e) {
          console.error(e);
        }
        if (tries >= 20) {
          clearInterval(timer);
          setPolling(false);
          void refreshBaseData();
        }
      }, 3500);
      return () => clearInterval(timer);
    }
    if (status === "cancelled") toast.message("Checkout cancelled.");
    return;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const startCheckout = async () => {
    if (!activePack) return;
    setSubmitting(true);
    try {
      // Card checkout should open NOWPayments with fiat rails visible by default.
      const payCurrency = paymentMethod === "card" ? "usd" : "btc";
      const invoice = await createFcInvoice(activePack.id, payCurrency);
      toast.success("Checkout ready. Redirecting...");
      window.open(invoice.checkoutUrl, "_blank", "noopener,noreferrer");
      await refreshBaseData();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Could not start checkout.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetHistory = async () => {
    const hasOrders = orders.length > 0;
    if (!hasOrders) return;
    const shouldReset = window.confirm(
      "Reset purchase history for this account?\n\nOK = clear pending test rows only\nCancel = keep history",
    );
    if (!shouldReset) return;
    try {
      const { deleted } = await resetFcPaymentHistory("pending");
      toast.success(deleted > 0 ? `Cleared ${deleted} pending test order(s).` : "No pending orders to clear.");
      await refreshBaseData();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Could not reset payment history.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-foreground relative overflow-hidden">
      <ParticleBackground />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#FF2D7B]/[0.08] via-transparent to-[#0a1620]/90" />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 md:py-10 pb-mobile-nav space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FF2D7B]/35 bg-[#FF2D7B]/10 px-4 py-1.5 text-sm">
            <Coins className="h-4 w-4 text-[#FF2D7B]" />
            <span className="font-semibold tabular-nums">{balance.toLocaleString()} FC</span>
          </div>
        </div>

        <section className="rounded-3xl border border-white/10 bg-black/45 backdrop-blur-xl p-6 md:p-8 shadow-[0_0_80px_rgba(255,45,123,0.15)]">
          <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">Forge Coin Store</p>
          <h1 className="font-gothic text-4xl mt-2">Buy Forge Coins (FC)</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Choose a Forge Coin pack and checkout with card or crypto. FC is your in-app currency for unlocks, visuals, and premium experiences.
          </p>
        </section>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
          <section className="rounded-3xl border border-white/10 bg-black/45 p-5 md:p-6">
            <h2 className="font-gothic text-2xl mb-4">Credit packs</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {packs.map((pack) => {
                const selected = selectedPackId === pack.id;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => setSelectedPackId(pack.id)}
                    className={cn(
                      "text-left rounded-2xl border p-4 transition-all",
                      selected
                        ? "border-[#FF2D7B]/50 bg-[#FF2D7B]/12 shadow-[0_0_36px_rgba(255,45,123,0.2)]"
                        : "border-white/10 bg-black/30 hover:border-white/25",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-gothic text-2xl">${pack.usd}</p>
                      {pack.badge ? (
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider",
                            pack.popular
                              ? "border-amber-300/40 bg-amber-400/10 text-amber-200"
                              : "border-white/20 bg-white/10 text-white/80",
                          )}
                        >
                          {pack.badge}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-white/90">{pack.fc.toLocaleString()} FC</p>
                    <p className="mt-1 text-xs text-muted-foreground">Best for: {pack.badge ?? "General use"}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="rounded-3xl border border-white/10 bg-black/45 p-5 md:p-6 space-y-4">
            <h2 className="font-gothic text-2xl">Checkout</h2>
            <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Order Summary</p>
              <p className="mt-2 text-sm">{activePack?.label ?? "Select a pack"}</p>
              <p className="text-xs text-muted-foreground mt-1">Forge Coins (FC) top-up after confirmation</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Payment method</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm flex items-center justify-center gap-2",
                    paymentMethod === "card" ? "border-[#FF2D7B]/50 bg-[#FF2D7B]/12" : "border-white/10 bg-black/30",
                  )}
                >
                  <CreditCard className="h-4 w-4" />
                  Card
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("crypto")}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm flex items-center justify-center gap-2",
                    paymentMethod === "crypto" ? "border-[#FF2D7B]/50 bg-[#FF2D7B]/12" : "border-white/10 bg-black/30",
                  )}
                >
                  <Wallet className="h-4 w-4" />
                  Crypto
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Card opens a fiat-first checkout (credit/debit options). Crypto opens with a wallet/asset flow.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void startCheckout()}
              disabled={!activePack || submitting}
              className="w-full rounded-2xl py-3.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${NEON}, hsl(280 45% 38%))` }}
            >
              {submitting ? "Creating invoice..." : "Continue to secure checkout"}
            </button>
            {polling ? (
              <div className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Waiting for payment confirmation...
              </div>
            ) : null}
          </aside>
        </div>

        <section className="rounded-3xl border border-white/10 bg-black/45 p-5 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-gothic text-2xl">Forge Coin Purchase History</h2>
            <button
              type="button"
              onClick={() => void handleResetHistory()}
              disabled={orders.length === 0}
              className="rounded-lg border border-white/15 bg-black/35 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-white hover:border-white/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reset pending tests
            </button>
          </div>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchases yet.</p>
          ) : (
            <ul className="space-y-2">
              {orders.map((row) => (
                <li key={row.id} className="rounded-xl border border-white/10 bg-black/35 px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-white">
                      ${row.usd_amount} · {row.fc_amount.toLocaleString()} FC
                    </p>
                    <span className={cn("text-[11px] uppercase tracking-wider rounded-full border px-2 py-0.5", statusTone(row.payment_status))}>
                      {row.payment_status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {new Date(row.created_at).toLocaleString()}
                    {row.invoice_url ? (
                      <>
                        {" · "}
                        <a href={row.invoice_url} target="_blank" rel="noreferrer" className="hover:text-white">
                          open invoice
                        </a>
                      </>
                    ) : null}
                  </p>
                  {row.payment_status === "completed" ? (
                    <p className="mt-1 text-[11px] text-emerald-300 inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Coins credited
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
