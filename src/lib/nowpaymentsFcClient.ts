import { supabase } from "@/integrations/supabase/client";

export type FcPack = {
  id: string;
  usd: number;
  fc: number;
  label: string;
  badge?: string;
  popular?: boolean;
};

export type FcOrderRow = {
  id: string;
  pack_id: string;
  usd_amount: number;
  fc_amount: number;
  payment_status: "pending" | "completed" | "failed" | "expired" | "refunded";
  payment_method: string | null;
  invoice_url: string | null;
  created_at: string;
  updated_at: string;
};

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("nowpayments-fc", { body });
  if (error) throw error;
  return data as T;
}

export async function fetchFcPacks(): Promise<FcPack[]> {
  const data = await invoke<{ packs: FcPack[] }>({ mode: "packs" });
  return (data.packs ?? []).map((p) => ({ ...p, popular: p.id === "popular_1650" }));
}

export async function createFcInvoice(packId: string, payCurrency?: string): Promise<{ orderId: string; checkoutUrl: string }> {
  const data = await invoke<{ orderId: string; checkoutUrl: string }>({
    mode: "create_invoice",
    packId,
    payCurrency: payCurrency || undefined,
  });
  return data;
}

export async function fetchFcPaymentHistory(): Promise<FcOrderRow[]> {
  const data = await invoke<{ rows: FcOrderRow[] }>({ mode: "payment_history" });
  return data.rows ?? [];
}

export async function fetchFcOrderStatus(orderId: string): Promise<{ status: FcOrderRow["payment_status"]; balance: number }> {
  const data = await invoke<{ order: { payment_status: FcOrderRow["payment_status"] }; balance: number }>({
    mode: "order_status",
    orderId,
  });
  return {
    status: data.order.payment_status,
    balance: data.balance,
  };
}

export async function resetFcPaymentHistory(scope: "pending" | "all" = "pending"): Promise<{ deleted: number }> {
  const data = await invoke<{ deleted: number }>({
    mode: "reset_payment_history",
    scope,
  });
  return { deleted: Number(data.deleted ?? 0) };
}
