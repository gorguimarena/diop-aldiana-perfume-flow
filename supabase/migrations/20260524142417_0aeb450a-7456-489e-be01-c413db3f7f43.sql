
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'vendeur');
CREATE TYPE public.perfume_category AS ENUM ('homme', 'femme', 'mixte');
CREATE TYPE public.payment_method AS ENUM ('wave', 'orange_money', 'especes', 'carte', 'virement');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- HAS ROLE FUNCTION
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- PERFUMES
CREATE TABLE public.perfumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category perfume_category NOT NULL DEFAULT 'mixte',
  description TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.perfumes ENABLE ROW LEVEL SECURITY;

-- SALES
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfume_id UUID NOT NULL REFERENCES public.perfumes(id) ON DELETE RESTRICT,
  perfume_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL,
  profit NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL,
  seller_id UUID NOT NULL REFERENCES auth.users(id),
  seller_name TEXT,
  customer_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES: profiles
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS: user_roles
CREATE POLICY "roles_select_self_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: perfumes (tout authentifié peut voir; admin gère)
CREATE POLICY "perfumes_select_auth" ON public.perfumes FOR SELECT TO authenticated USING (true);
CREATE POLICY "perfumes_admin_insert" ON public.perfumes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "perfumes_admin_update" ON public.perfumes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "perfumes_admin_delete" ON public.perfumes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: sales
CREATE POLICY "sales_select_auth" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "sales_insert_own" ON public.sales FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "sales_admin_update" ON public.sales FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sales_admin_delete" ON public.sales FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- TRIGGER: update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER perfumes_updated_at BEFORE UPDATE ON public.perfumes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- TRIGGER: décrémenter stock à la vente
CREATE OR REPLACE FUNCTION public.decrement_stock_on_sale()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_stock INTEGER;
BEGIN
  SELECT stock_quantity INTO current_stock FROM public.perfumes WHERE id = NEW.perfume_id FOR UPDATE;
  IF current_stock IS NULL THEN RAISE EXCEPTION 'Parfum introuvable'; END IF;
  IF current_stock < NEW.quantity THEN RAISE EXCEPTION 'Stock insuffisant (% restant)', current_stock; END IF;
  UPDATE public.perfumes SET stock_quantity = stock_quantity - NEW.quantity WHERE id = NEW.perfume_id;
  RETURN NEW;
END $$;
CREATE TRIGGER sales_decrement_stock AFTER INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.decrement_stock_on_sale();

-- TRIGGER: create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_first_user BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first_user;
  IF is_first_user THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'vendeur');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes
CREATE INDEX idx_sales_created_at ON public.sales(created_at DESC);
CREATE INDEX idx_sales_seller ON public.sales(seller_id);
CREATE INDEX idx_sales_payment ON public.sales(payment_method);
CREATE INDEX idx_perfumes_name ON public.perfumes(name);
