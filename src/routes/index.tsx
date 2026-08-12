import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicHeader } from "@/components/PublicHeader";
import { CartCheckoutSheet } from "@/components/CartCheckoutSheet";
import { useCart } from "@/components/cart-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { fXOF, CATEGORY_LABELS } from "@/lib/format";
import { Search, ShoppingBag, Tag, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: PublicCatalogPage,
  head: () => ({
    meta: [
      { title: "Diop Aldiana — Catalogue de parfums" },
      { name: "description", content: "Parcourez le catalogue Diop Aldiana et commandez sans créer de compte." },
    ],
  }),
});

type Perfume = {
  id: string;
  name: string;
  category: "homme" | "femme" | "mixte";
  description: string | null;
  stock_quantity: number;
  selling_price: number;
  volume_ml: number | null;
  image_url: string | null;
};

type Promotion = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  volume_ml: number;
  quantity_required: number;
  price: number;
};

function PublicCatalogPage() {
  const { addItem } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | Perfume["category"]>("all");
  const [volumeFilter, setVolumeFilter] = useState<"all" | "20" | "30" | "other">("all");
  const [promoPick, setPromoPick] = useState<Promotion | null>(null);
  const [promoSelected, setPromoSelected] = useState<string[]>([]);

  const { data: perfumes = [], isLoading } = useQuery({
    queryKey: ["public-perfumes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfumes")
        .select("id,name,category,description,stock_quantity,selling_price,volume_ml,image_url")
        .gt("stock_quantity", 0)
        .order("name");
      if (error) throw error;
      return data as Perfume[];
    },
  });

  const { data: promos = [] } = useQuery({
    queryKey: ["public-promotions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promotions")
        .select("id,name,description,image_url,volume_ml,quantity_required,price")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Promotion[];
    },
  });

  const filtered = useMemo(() => perfumes.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (volumeFilter === "20" && p.volume_ml !== 20) return false;
    if (volumeFilter === "30" && p.volume_ml !== 30) return false;
    if (volumeFilter === "other" && (p.volume_ml === 20 || p.volume_ml === 30 || p.volume_ml == null)) return false;
    return true;
  }), [perfumes, search, categoryFilter, volumeFilter]);

  const promoCandidates = useMemo(() => {
    if (!promoPick) return [];
    return perfumes.filter((p) => p.volume_ml === promoPick.volume_ml && p.stock_quantity > 0);
  }, [promoPick, perfumes]);

  const addPerfume = (p: Perfume) => {
    addItem({
      perfume_id: p.id,
      perfume_name: p.name,
      quantity: 1,
      unit_price: Number(p.selling_price),
      volume_ml: p.volume_ml,
      image_url: p.image_url,
    });
    toast.success(`${p.name} ajouté au panier`);
    setCartOpen(true);
  };

  const openPromo = (promo: Promotion) => {
    setPromoPick(promo);
    setPromoSelected([]);
  };

  const togglePromoPerfume = (id: string) => {
    if (!promoPick) return;
    setPromoSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= promoPick.quantity_required) {
        toast.error(`Choisissez exactement ${promoPick.quantity_required} parfums`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const confirmPromo = () => {
    if (!promoPick) return;
    if (promoSelected.length !== promoPick.quantity_required) {
      return toast.error(`Sélectionnez ${promoPick.quantity_required} parfums`);
    }
    const unit = Number(promoPick.price) / promoPick.quantity_required;
    for (const id of promoSelected) {
      const p = perfumes.find((x) => x.id === id);
      if (!p) continue;
      addItem({
        perfume_id: p.id,
        perfume_name: p.name,
        promo_id: promoPick.id,
        promo_name: promoPick.name,
        quantity: 1,
        unit_price: unit,
        volume_ml: p.volume_ml,
        image_url: p.image_url,
      });
    }
    toast.success("Pack promo ajouté au panier");
    setPromoPick(null);
    setPromoSelected([]);
    setCartOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 opacity-40">
        <div className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-gold/15 blur-3xl" />
        <div className="absolute bottom-20 right-0 h-80 w-80 rounded-full bg-gold-soft/10 blur-3xl" />
      </div>

      <PublicHeader onOpenCart={() => setCartOpen(true)} />
      <CartCheckoutSheet open={cartOpen} onOpenChange={setCartOpen} />

      <main className="relative mx-auto max-w-6xl px-4 py-8 space-y-10">
        <section className="space-y-3 max-w-2xl">
          <h1 className="font-display text-4xl md:text-5xl text-gradient-gold">Catalogue</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Parcourez nos parfums et packs promo. Commandez sans compte — indiquez simplement votre nom et votre numéro.
          </p>
        </section>

        {promos.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-gold" />
              <h2 className="font-display text-2xl">Promotions</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {promos.map((promo) => (
                <Card key={promo.id} className="overflow-hidden border-gold/30">
                  <div className="aspect-[16/10] bg-muted/40">
                    {promo.image_url ? (
                      <img src={promo.image_url} alt={promo.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Promo</div>
                    )}
                  </div>
                  <CardContent className="pt-4 space-y-3">
                    <div>
                      <h3 className="font-display text-xl">{promo.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {promo.quantity_required} × {promo.volume_ml} ml — {fXOF(promo.price)}
                      </p>
                    </div>
                    <Button className="w-full bg-gradient-gold text-primary-foreground" onClick={() => openPromo(promo)}>
                      Choisir {promo.quantity_required} parfums
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <h2 className="font-display text-2xl">Parfums</h2>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as typeof categoryFilter)}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                <SelectItem value="homme">Homme</SelectItem>
                <SelectItem value="femme">Femme</SelectItem>
                <SelectItem value="mixte">Mixte</SelectItem>
              </SelectContent>
            </Select>
            <Select value={volumeFilter} onValueChange={(v) => setVolumeFilter(v as typeof volumeFilter)}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous volumes</SelectItem>
                <SelectItem value="20">20 ml</SelectItem>
                <SelectItem value="30">30 ml</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement du catalogue…</p>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun parfum disponible</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((p) => (
                <Card key={p.id} className="overflow-hidden hover:border-gold/40 transition-colors">
                  <div className="aspect-[16/10] bg-muted/40">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Sans image</div>
                    )}
                  </div>
                  <CardContent className="pt-4 space-y-3">
                    <div>
                      <h3 className="font-display text-xl truncate">{p.name}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <Badge variant="secondary" className="text-[10px] uppercase">{CATEGORY_LABELS[p.category]}</Badge>
                        {p.volume_ml != null && <Badge variant="outline" className="text-[10px]">{p.volume_ml} ml</Badge>}
                      </div>
                      {p.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{p.description}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-xl text-gradient-gold">{fXOF(p.selling_price)}</span>
                      <Button size="sm" className="bg-gradient-gold text-primary-foreground" onClick={() => addPerfume(p)}>
                        <ShoppingBag className="h-3.5 w-3.5 mr-1" /> Ajouter
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      <Dialog open={Boolean(promoPick)} onOpenChange={(o) => { if (!o) setPromoPick(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{promoPick?.name}</DialogTitle>
          </DialogHeader>
          {promoPick && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Sélectionnez {promoPick.quantity_required} parfums de {promoPick.volume_ml} ml
                ({promoSelected.length}/{promoPick.quantity_required}) — total {fXOF(promoPick.price)}
              </p>
              <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto">
                {promoCandidates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucun parfum {promoPick.volume_ml} ml en stock</p>
                ) : promoCandidates.map((p) => {
                  const checked = promoSelected.includes(p.id);
                  const disabled = !checked && promoSelected.length >= promoPick.quantity_required;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => togglePromoPerfume(p.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-md border p-2 text-left",
                        checked ? "border-gold bg-gold/10" : "border-border/60",
                        disabled && "opacity-40",
                      )}
                    >
                      <div className="h-12 w-12 rounded overflow-hidden bg-muted/40 shrink-0">
                        {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{p.name}</div>
                        <div className="text-[11px] text-muted-foreground">{fXOF(p.selling_price)}</div>
                      </div>
                      {checked && <Check className="h-4 w-4 text-gold" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              className="bg-gradient-gold text-primary-foreground"
              disabled={!promoPick || promoSelected.length !== promoPick.quantity_required}
              onClick={confirmPromo}
            >
              Ajouter au panier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
