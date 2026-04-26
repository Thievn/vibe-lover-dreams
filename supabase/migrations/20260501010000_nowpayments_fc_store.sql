CREATE TABLE IF NOT EXISTS public.fc_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  pack_id text NOT NULL,
  usd_amount numeric(10,2) NOT NULL CHECK (usd_amount > 0),
  fc_amount integer NOT NULL CHECK (fc_amount > 0),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'expired', 'refunded')),
  payment_method text,
  nowpayments_payment_id text UNIQUE,
  nowpayments_order_id text UNIQUE,
  invoice_url text,
  pay_currency text,
  pay_amount numeric(20,8),
  webhook_payload jsonb NOT NULL DEFAULT '{}',
  completed_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fc_purchase_orders_user_created_idx
  ON public.fc_purchase_orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS fc_purchase_orders_status_idx
  ON public.fc_purchase_orders (payment_status, created_at DESC);

ALTER TABLE public.fc_purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own FC purchase orders"
  ON public.fc_purchase_orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.touch_fc_purchase_orders_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fc_purchase_orders_updated_at ON public.fc_purchase_orders;
CREATE TRIGGER trg_fc_purchase_orders_updated_at
BEFORE UPDATE ON public.fc_purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.touch_fc_purchase_orders_updated_at();
