import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Pencil, Trash2, AlertTriangle, PackageX } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "sonner";
import { fXOF, CATEGORY_LABELS } from "@/lib/format";

export const Route = createFileRoute("/_app/parfums")({ component: ParfumsPage });

type Perfume = {
  id: string;
  name: string;
  category: "homme" | "femme" | "mixte";
  description: string | null;
  stock_quantity: number;
  purchase_price: number;
  selling_price: number;
  low_stock_threshold: number;
  volume_ml: number | null;
  image_url: string | null;
};

function ParfumsPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | Perfume["category"]>("all");
  const [volumeFilter, setVolumeFilter] = useState<"all" | "20" | "30" | "other">("all");
  const [editing, setEditing] = useState<Perfume | null>(null);
  const [open, setOpen] = useState(false);

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["perfumes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("perfumes").select("*").order("name");
      if (error) throw error;
      return data as Perfume[];
    },
  });

  const filtered = useMemo(() => list.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (volumeFilter === "20" && p.volume_ml !== 20) return false;
    if (volumeFilter === "30" && p.volume_ml !== 30) return false;
    if (volumeFilter === "other" && (p.volume_ml === 20 || p.volume_ml === 30 || p.volume_ml == null)) return false;
    if (stockFilter === "out" && p.stock_quantity > 0) return false;
    if (stockFilter === "low" && !(p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold)) return false;
    return true;
  }), [list, search, categoryFilter, volumeFilter, stockFilter]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("perfumes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Parfum supprimé"); qc.invalidateQueries({ queryKey: ["perfumes"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-gradient-gold">Catalogue</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filtered.length} / {list.length} références
          </p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-gold text-primary-foreground" onClick={() => setEditing(null)}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter
              </Button>
            </DialogTrigger>
            <PerfumeForm
              key={editing?.id ?? "new"}
              editing={editing}
              onDone={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["perfumes"] }); }}
            />
          </Dialog>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un parfum…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as typeof categoryFilter)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            <SelectItem value="homme">Homme</SelectItem>
            <SelectItem value="femme">Femme</SelectItem>
            <SelectItem value="mixte">Mixte</SelectItem>
          </SelectContent>
        </Select>
        <Select value={volumeFilter} onValueChange={(v) => setVolumeFilter(v as typeof volumeFilter)}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Volume" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous volumes</SelectItem>
            <SelectItem value="20">20 ml</SelectItem>
            <SelectItem value="30">30 ml</SelectItem>
            <SelectItem value="other">Autre</SelectItem>
          </SelectContent>
        </Select>
        <Tabs value={stockFilter} onValueChange={(v) => setStockFilter(v as typeof stockFilter)}>
          <TabsList>
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="low">Stock faible</TabsTrigger>
            <TabsTrigger value="out">Rupture</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Chargement…</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun parfum</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const low = p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold;
            const out = p.stock_quantity === 0;
            return (
              <Card key={p.id} className="overflow-hidden hover:border-gold/40 transition-colors">
                <div className="aspect-[16/10] bg-muted/40 overflow-hidden">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                      Sans image
                    </div>
                  )}
                </div>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h3 className="font-display text-xl truncate">{p.name}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                          {CATEGORY_LABELS[p.category]}
                        </Badge>
                        {p.volume_ml != null && (
                          <Badge variant="outline" className="text-[10px]">{p.volume_ml} ml</Badge>
                        )}
                      </div>
                    </div>
                    {out ? (
                      <Badge variant="destructive" className="gap-1"><PackageX className="h-3 w-3" />Rupture</Badge>
                    ) : low ? (
                      <Badge className="bg-warning/20 text-warning border-warning/30 gap-1">
                        <AlertTriangle className="h-3 w-3" />Faible
                      </Badge>
                    ) : null}
                  </div>
                  {p.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.description}</p>}
                  <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-border/50">
                    <Stat label="Stock" value={String(p.stock_quantity)} />
                    <Stat label="Achat" value={fXOF(p.purchase_price)} />
                    <Stat label="Vente" value={fXOF(p.selling_price)} highlight />
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditing(p); setOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Modifier
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer ce parfum ?</AlertDialogTitle>
                            <AlertDialogDescription>"{p.name}" sera définitivement retiré du catalogue.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => del.mutate(p.id)}>Supprimer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-sm font-medium mt-0.5 ${highlight ? "text-gold" : ""}`}>{value}</div>
    </div>
  );
}

function PerfumeForm({ editing, onDone }: { editing: Perfume | null; onDone: () => void }) {
  const [name, setName] = useState(editing?.name ?? "");
  const [category, setCategory] = useState<Perfume["category"]>(editing?.category ?? "mixte");
  const [stock, setStock] = useState(String(editing?.stock_quantity ?? 0));
  const [purchase, setPurchase] = useState(String(editing?.purchase_price ?? 0));
  const [selling, setSelling] = useState(String(editing?.selling_price ?? 0));
  const [threshold, setThreshold] = useState(String(editing?.low_stock_threshold ?? 5));
  const [volume, setVolume] = useState(editing?.volume_ml != null ? String(editing.volume_ml) : "");
  const [imageUrl, setImageUrl] = useState<string | null>(editing?.image_url ?? null);
  const [description, setDescription] = useState(editing?.description ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const volumeMl = volume.trim() === "" ? null : parseInt(volume, 10);
    if (volumeMl != null && (!Number.isFinite(volumeMl) || volumeMl <= 0)) {
      setSaving(false);
      return toast.error("Volume invalide");
    }
    const payload = {
      name: name.trim(),
      category,
      stock_quantity: parseInt(stock) || 0,
      purchase_price: parseFloat(purchase) || 0,
      selling_price: parseFloat(selling) || 0,
      low_stock_threshold: parseInt(threshold) || 5,
      volume_ml: volumeMl,
      image_url: imageUrl,
      description: description.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("perfumes").update(payload).eq("id", editing.id)
      : await supabase.from("perfumes").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Parfum modifié" : "Parfum ajouté");
    onDone();
  };

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl">{editing ? "Modifier le parfum" : "Nouveau parfum"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <ImageUpload value={imageUrl} onChange={setImageUrl} />
        <div className="space-y-2">
          <Label>Nom *</Label>
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Perfume["category"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="homme">Homme</SelectItem>
                <SelectItem value="femme">Femme</SelectItem>
                <SelectItem value="mixte">Mixte</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Volume (ml)</Label>
            <Input type="number" min="1" placeholder="20 ou 30" value={volume} onChange={(e) => setVolume(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Quantité en stock</Label>
            <Input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Seuil stock faible</Label>
            <Input type="number" min="0" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Prix d'achat (FCFA)</Label>
            <Input type="number" min="0" step="100" value={purchase} onChange={(e) => setPurchase(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Prix de vente (FCFA)</Label>
            <Input type="number" min="0" step="100" value={selling} onChange={(e) => setSelling(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Description (optionnel)</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving} className="bg-gradient-gold text-primary-foreground">
            {saving ? "Enregistrement…" : editing ? "Mettre à jour" : "Ajouter"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
