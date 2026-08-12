import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";
import { fXOF, PAYMENT_LABELS } from "@/lib/format";
import { ShoppingCart, Banknote, TrendingUp, Tag, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/ventes")({ component: VentesPage });

type Perfume = {
  id: string;
  name: string;
  stock_quantity: number;
  selling_price: number;
  purchase_price: number;
  volume_ml: number | null;
  image_url: string | null;
};

type Promotion = {
  id: string;
  name: string;
  volume_ml: number;
  quantity_required: number;
  price: number;
  image_url: string | null;
};

type Payment = "wave" | "orange_money" | "especes" | "carte" | "virement";

function VentesPage() {
  const [mode, setMode] = useState<"simple" | "promo">("simple");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-gradient-gold">Nouvelle vente</h1>
        <p className="text-muted-foreground text-sm mt-1">Vente simple ou pack promo</p>
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
        <TabsList>
          <TabsTrigger value="simple" className="gap-1.5">
            <ShoppingCart className="h-3.5 w-3.5" /> Vente simple
          </TabsTrigger>
          <TabsTrigger value="promo" className="gap-1.5">
            <Tag className="h-3.5 w-3.5" /> Promo
          </TabsTrigger>
        </TabsList>
        <TabsContent value="simple" className="mt-4">
          <SimpleSaleForm />
        </TabsContent>
        <TabsContent value="promo" className="mt-4">
          <PromoSaleForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SimpleSaleForm() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [perfumeId, setPerfumeId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [payment, setPayment] = useState<Payment>("especes");
  const [customer, setCustomer] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: perfumes = [] } = useQuery({
    queryKey: ["perfumes", "available"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfumes")
        .select("id,name,stock_quantity,selling_price,purchase_price,volume_ml,image_url")
        .gt("stock_quantity", 0)
        .order("name");
      if (error) throw error;
      return data as Perfume[];
    },
  });

  const selected = useMemo(() => perfumes.find((p) => p.id === perfumeId), [perfumes, perfumeId]);
  const q = parseInt(quantity) || 0;
  const u = parseFloat(unitPrice) || 0;
  const total = q * u;
  const profit = selected ? (u - Number(selected.purchase_price)) * q : 0;

  const onSelect = (id: string) => {
    setPerfumeId(id);
    const p = perfumes.find((x) => x.id === id);
    if (p) setUnitPrice(String(p.selling_price));
  };

  const submit = useMutation({
    mutationFn: async () => {
      if (!selected || !user) throw new Error("Sélection invalide");
      if (q > selected.stock_quantity) throw new Error("Stock insuffisant");
      const { error } = await supabase.from("sales").insert({
        perfume_id: selected.id,
        perfume_name: selected.name,
        quantity: q,
        unit_price: u,
        unit_cost: Number(selected.purchase_price),
        total,
        profit,
        payment_method: payment,
        seller_id: user.id,
        seller_name: profile?.full_name ?? profile?.email ?? "Vendeur",
        customer_name: customer.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vente enregistrée ✓");
      setPerfumeId(""); setQuantity("1"); setUnitPrice(""); setCustomer("");
      qc.invalidateQueries({ queryKey: ["perfumes"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perfumeId) return toast.error("Sélectionnez un parfum");
    if (q <= 0) return toast.error("Quantité invalide");
    setSaving(true);
    try {
      await submit.mutateAsync();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-4 w-4 text-gold" /> Détails de la vente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Parfum *</Label>
              <Select value={perfumeId} onValueChange={onSelect}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un parfum…" /></SelectTrigger>
                <SelectContent>
                  {perfumes.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground">Aucun parfum disponible en stock</div>
                  ) : perfumes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.volume_ml != null ? ` (${p.volume_ml} ml)` : ""} — {p.stock_quantity} en stock
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Quantité *</Label>
                <Input type="number" min="1" max={selected?.stock_quantity ?? undefined} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                {selected && <p className="text-xs text-muted-foreground">Stock dispo : {selected.stock_quantity}</p>}
              </div>
              <div className="space-y-2">
                <Label>Prix unitaire (FCFA) *</Label>
                <Input type="number" min="0" step="100" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Moyen de paiement *</Label>
                <Select value={payment} onValueChange={(v) => setPayment(v as Payment)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Client (optionnel)</Label>
                <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Nom du client" />
              </div>
            </div>

            <Button type="submit" disabled={saving || !perfumeId} className="w-full bg-gradient-gold text-primary-foreground">
              {saving ? "Enregistrement…" : "Valider la vente"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <SummaryCard
        lines={[
          { label: "Parfum", value: selected?.name ?? "—" },
          { label: "Quantité", value: String(q || 0) },
          { label: "Prix unitaire", value: fXOF(u) },
        ]}
        total={total}
        profit={profit}
      />
    </div>
  );
}

function PromoSaleForm() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [promoId, setPromoId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [payment, setPayment] = useState<Payment>("especes");
  const [customer, setCustomer] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: promos = [] } = useQuery({
    queryKey: ["promotions", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promotions")
        .select("id,name,volume_ml,quantity_required,price,image_url")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Promotion[];
    },
  });

  const promo = useMemo(() => promos.find((p) => p.id === promoId), [promos, promoId]);

  const { data: perfumes = [] } = useQuery({
    queryKey: ["perfumes", "promo", promo?.volume_ml],
    enabled: Boolean(promo),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfumes")
        .select("id,name,stock_quantity,selling_price,purchase_price,volume_ml,image_url")
        .eq("volume_ml", promo!.volume_ml)
        .gt("stock_quantity", 0)
        .order("name");
      if (error) throw error;
      return data as Perfume[];
    },
  });

  const selectedPerfumes = useMemo(
    () => selectedIds.map((id) => perfumes.find((p) => p.id === id)).filter(Boolean) as Perfume[],
    [selectedIds, perfumes],
  );

  const unitPrice = promo ? Number(promo.price) / promo.quantity_required : 0;
  const total = promo ? Number(promo.price) : 0;
  const profit = selectedPerfumes.reduce(
    (acc, p) => acc + (unitPrice - Number(p.purchase_price)),
    0,
  );

  const onPromoChange = (id: string) => {
    setPromoId(id);
    setSelectedIds([]);
  };

  const togglePerfume = (id: string) => {
    if (!promo) return;
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= promo.quantity_required) {
        toast.error(`Sélectionnez exactement ${promo.quantity_required} parfums`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const submit = useMutation({
    mutationFn: async () => {
      if (!promo || !user) throw new Error("Sélection invalide");
      if (selectedPerfumes.length !== promo.quantity_required) {
        throw new Error(`Choisissez exactement ${promo.quantity_required} parfums`);
      }
      for (const p of selectedPerfumes) {
        if (p.volume_ml !== promo.volume_ml) throw new Error(`Volume incorrect : ${p.name}`);
        if (p.stock_quantity < 1) throw new Error(`Stock insuffisant : ${p.name}`);
      }

      const promoGroupId = crypto.randomUUID();
      const sellerName = profile?.full_name ?? profile?.email ?? "Vendeur";
      const rows = selectedPerfumes.map((p) => ({
        perfume_id: p.id,
        perfume_name: p.name,
        quantity: 1,
        unit_price: unitPrice,
        unit_cost: Number(p.purchase_price),
        total: unitPrice,
        profit: unitPrice - Number(p.purchase_price),
        payment_method: payment,
        seller_id: user.id,
        seller_name: sellerName,
        customer_name: customer.trim() || null,
        promo_id: promo.id,
        promo_name: promo.name,
        promo_group_id: promoGroupId,
      }));

      const { error } = await supabase.from("sales").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vente promo enregistrée ✓");
      setSelectedIds([]);
      setCustomer("");
      qc.invalidateQueries({ queryKey: ["perfumes"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promo) return toast.error("Sélectionnez une promo");
    if (selectedPerfumes.length !== promo.quantity_required) {
      return toast.error(`Sélectionnez ${promo.quantity_required} parfums`);
    }
    setSaving(true);
    try {
      await submit.mutateAsync();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="h-4 w-4 text-gold" /> Vente promo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Promotion *</Label>
              <Select value={promoId} onValueChange={onPromoChange}>
                <SelectTrigger><SelectValue placeholder="Choisir une promo…" /></SelectTrigger>
                <SelectContent>
                  {promos.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground">Aucune promo active</div>
                  ) : promos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {p.quantity_required}×{p.volume_ml} ml — {fXOF(p.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {promo && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>
                    Parfums {promo.volume_ml} ml ({selectedIds.length}/{promo.quantity_required})
                  </Label>
                  <Badge variant="outline" className="text-[10px]">
                    {fXOF(unitPrice)} / flacon
                  </Badge>
                </div>
                {perfumes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
                    Aucun parfum {promo.volume_ml} ml en stock
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                    {perfumes.map((p) => {
                      const checked = selectedIds.includes(p.id);
                      const disabled = !checked && selectedIds.length >= promo.quantity_required;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => togglePerfume(p.id)}
                          className={cn(
                            "flex items-center gap-3 rounded-md border p-2 text-left transition-colors",
                            checked ? "border-gold bg-gold/10" : "border-border/60 hover:border-gold/40",
                            disabled && "opacity-40 cursor-not-allowed",
                          )}
                        >
                          <div className="h-12 w-12 shrink-0 rounded overflow-hidden bg-muted/40">
                            {p.image_url ? (
                              <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{p.name}</div>
                            <div className="text-[11px] text-muted-foreground">Stock {p.stock_quantity}</div>
                          </div>
                          {checked && <Check className="h-4 w-4 text-gold shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Moyen de paiement *</Label>
                <Select value={payment} onValueChange={(v) => setPayment(v as Payment)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Client (optionnel)</Label>
                <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Nom du client" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={saving || !promo || selectedIds.length !== (promo?.quantity_required ?? -1)}
              className="w-full bg-gradient-gold text-primary-foreground"
            >
              {saving ? "Enregistrement…" : "Valider la promo"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <SummaryCard
        lines={[
          { label: "Promo", value: promo?.name ?? "—" },
          { label: "Pack", value: promo ? `${promo.quantity_required} × ${promo.volume_ml} ml` : "—" },
          { label: "Sélection", value: `${selectedIds.length} / ${promo?.quantity_required ?? 0}` },
        ]}
        total={total}
        profit={selectedPerfumes.length === (promo?.quantity_required ?? 0) ? profit : 0}
      />
    </div>
  );
}

function SummaryCard({
  lines,
  total,
  profit,
}: {
  lines: { label: string; value: string }[];
  total: number;
  profit: number;
}) {
  return (
    <Card className="border-gold/40 bg-gradient-to-br from-gold/5 to-transparent h-fit">
      <CardHeader><CardTitle className="text-base">Résumé</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {lines.map((l) => (
          <SummaryRow key={l.label} label={l.label} value={l.value} />
        ))}
        <div className="h-px bg-border/60" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Banknote className="h-4 w-4 text-gold" /><span className="text-sm">Total</span></div>
          <span className="font-display text-2xl text-gradient-gold">{fXOF(total)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-success" /><span className="text-sm">Bénéfice estimé</span></div>
          <span className="font-medium text-success">{fXOF(profit)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium truncate ml-2 max-w-[60%] text-right">{value}</span>
    </div>
  );
}
