import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "sonner";
import { fXOF } from "@/lib/format";

export const Route = createFileRoute("/_app/promotions")({ component: PromotionsPage });

type Promotion = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  volume_ml: number;
  quantity_required: number;
  price: number;
  is_active: boolean;
};

function PromotionsPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [open, setOpen] = useState(false);

  if (role && !isAdmin) return <Navigate to="/dashboard" replace />;

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["promotions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("promotions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Promotion[];
    },
    enabled: isAdmin,
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promotions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Promo supprimée"); qc.invalidateQueries({ queryKey: ["promotions"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("promotions").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["promotions"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-gradient-gold">Promotions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Packs type « {list[0] ? `${list[0].quantity_required} × ${list[0].volume_ml} ml` : "3 × 20 ml"} » à prix fixe
          </p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-gold text-primary-foreground" onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4 mr-1" /> Nouvelle promo
            </Button>
          </DialogTrigger>
          <PromoForm
            key={editing?.id ?? "new"}
            editing={editing}
            onDone={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["promotions"] }); }}
          />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Chargement…</div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground space-y-2">
            <Tag className="h-8 w-8 mx-auto opacity-50" />
            <p>Aucune promotion. Ex. : 3 parfums 20 ml à 5 000 F</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((p) => (
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
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display text-xl truncate">{p.name}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <Badge variant="outline" className="text-[10px]">
                        {p.quantity_required} × {p.volume_ml} ml
                      </Badge>
                      <Badge className="bg-gold/20 text-gold border-gold/30 text-[10px]">
                        {fXOF(p.price)}
                      </Badge>
                      {!p.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                    </div>
                  </div>
                  <Switch
                    checked={p.is_active}
                    onCheckedChange={(checked) => toggleActive.mutate({ id: p.id, is_active: checked })}
                  />
                </div>
                {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                <div className="flex gap-2">
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
                        <AlertDialogTitle>Supprimer cette promo ?</AlertDialogTitle>
                        <AlertDialogDescription>"{p.name}" sera retirée. Les ventes passées restent intactes.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => del.mutate(p.id)}>Supprimer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PromoForm({ editing, onDone }: { editing: Promotion | null; onDone: () => void }) {
  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [volume, setVolume] = useState(String(editing?.volume_ml ?? 20));
  const [quantity, setQuantity] = useState(String(editing?.quantity_required ?? 3));
  const [price, setPrice] = useState(String(editing?.price ?? 5000));
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);
  const [imageUrl, setImageUrl] = useState<string | null>(editing?.image_url ?? null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const volume_ml = parseInt(volume, 10);
    const quantity_required = parseInt(quantity, 10);
    const priceNum = parseFloat(price);
    if (!Number.isFinite(volume_ml) || volume_ml <= 0) return toast.error("Volume invalide");
    if (!Number.isFinite(quantity_required) || quantity_required <= 0) return toast.error("Quantité invalide");
    if (!Number.isFinite(priceNum) || priceNum < 0) return toast.error("Prix invalide");

    setSaving(true);
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      volume_ml,
      quantity_required,
      price: priceNum,
      is_active: isActive,
      image_url: imageUrl,
    };
    const { error } = editing
      ? await supabase.from("promotions").update(payload).eq("id", editing.id)
      : await supabase.from("promotions").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Promo modifiée" : "Promo créée");
    onDone();
  };

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl">{editing ? "Modifier la promo" : "Nouvelle promo"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <ImageUpload value={imageUrl} onChange={setImageUrl} />
        <div className="space-y-2">
          <Label>Nom *</Label>
          <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Pack 3 × 20 ml" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Volume (ml) *</Label>
            <Input type="number" min="1" required value={volume} onChange={(e) => setVolume(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Qté *</Label>
            <Input type="number" min="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Prix (F) *</Label>
            <Input type="number" min="0" step="100" required value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
          <Label htmlFor="promo-active">Active</Label>
          <Switch id="promo-active" checked={isActive} onCheckedChange={setIsActive} />
        </div>
        <div className="space-y-2">
          <Label>Description (optionnel)</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving} className="bg-gradient-gold text-primary-foreground">
            {saving ? "Enregistrement…" : editing ? "Mettre à jour" : "Créer"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
