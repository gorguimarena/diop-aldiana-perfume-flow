-- Volume on perfumes + promotions table + promo fields on sales

ALTER TABLE public.perfumes
  ADD COLUMN IF NOT EXISTS volume_ml INTEGER CHECK (volume_ml IS NULL OR volume_ml > 0);

CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  volume_ml INTEGER NOT NULL CHECK (volume_ml > 0),
  quantity_required INTEGER NOT NULL CHECK (quantity_required > 0),
  price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promotions_select_auth" ON public.promotions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "promotions_admin_insert" ON public.promotions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "promotions_admin_update" ON public.promotions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "promotions_admin_delete" ON public.promotions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS promo_id UUID REFERENCES public.promotions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promo_name TEXT,
  ADD COLUMN IF NOT EXISTS promo_group_id UUID;

CREATE INDEX IF NOT EXISTS idx_perfumes_volume ON public.perfumes(volume_ml);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON public.promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_sales_promo_group ON public.sales(promo_group_id);
CREATE INDEX IF NOT EXISTS idx_sales_promo_id ON public.sales(promo_id);
