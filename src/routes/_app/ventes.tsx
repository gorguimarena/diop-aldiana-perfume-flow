import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";
import { fXOF, PAYMENT_LABELS } from "@/lib/format";
import { ShoppingCart, Banknote, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_app/ventes")({ component: VentesPage });

type Perfume = { id: string; name: string; stock_quantity: number; selling_price: number; purchase_price: number };

function VentesPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [perfumeId, setPerfumeId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [payment, setPayment] = useState<"wave" | "orange_money" | "especes" | "carte" | "virement">("especes");
  const [customer, setCustomer] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: perfumes = [] } = useQuery({
    queryKey: ["perfumes", "available"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfumes")
        .select("id,name,stock_quantity,selling_price,purchase_price")
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
    await submit.mutateAsync();
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-gradient-gold">Nouvelle vente</h1>
        <p className="text-muted-foreground text-sm mt-1">Enregistrez rapidement une transaction</p>
      </div>

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
                        {p.name} — {p.stock_quantity} en stock
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
                  <Select value={payment} onValueChange={setPayment}>
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

        <Card className="border-gold/40 bg-gradient-to-br from-gold/5 to-transparent h-fit">
          <CardHeader><CardTitle className="text-base">Résumé</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <SummaryRow label="Parfum" value={selected?.name ?? "—"} />
            <SummaryRow label="Quantité" value={String(q || 0)} />
            <SummaryRow label="Prix unitaire" value={fXOF(u)} />
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
      </div>
    </div>
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
