-- Public catalog (anon read) + guest orders

CREATE TYPE public.guest_order_status AS ENUM ('pending', 'confirmed', 'cancelled');

CREATE TABLE public.guest_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  status public.guest_order_status NOT NULL DEFAULT 'pending',
  total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.guest_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.guest_orders(id) ON DELETE CASCADE,
  perfume_id UUID REFERENCES public.perfumes(id) ON DELETE SET NULL,
  perfume_name TEXT NOT NULL,
  promo_id UUID REFERENCES public.promotions(id) ON DELETE SET NULL,
  promo_name TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  volume_ml INTEGER
);

ALTER TABLE public.guest_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_order_items ENABLE ROW LEVEL SECURITY;

-- Catalogue visible sans connexion
CREATE POLICY "perfumes_select_anon" ON public.perfumes
  FOR SELECT TO anon USING (true);

CREATE POLICY "promotions_select_anon_active" ON public.promotions
  FOR SELECT TO anon USING (is_active = true);

-- Commandes : lecture / maj réservées au staff authentifié
CREATE POLICY "guest_orders_select_auth" ON public.guest_orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "guest_orders_update_auth" ON public.guest_orders
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'vendeur'));

CREATE POLICY "guest_order_items_select_auth" ON public.guest_order_items
  FOR SELECT TO authenticated USING (true);

-- Inserts via service role (server function) — pas d'insert anon direct

CREATE TRIGGER guest_orders_updated_at
  BEFORE UPDATE ON public.guest_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_guest_orders_created ON public.guest_orders(created_at DESC);
CREATE INDEX idx_guest_orders_status ON public.guest_orders(status);
CREATE INDEX idx_guest_order_items_order ON public.guest_order_items(order_id);
