import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { fDate, fXOF } from "@/lib/format";

export const Route = createFileRoute("/_app/commandes")({ component: CommandesPage });

type GuestOrder = {
  id: string;
  customer_name: string;
  customer_phone: string;
  status: "pending" | "confirmed" | "cancelled";
  total: number;
  notes: string | null;
  created_at: string;
};

type GuestOrderItem = {
  id: string;
  perfume_name: string;
  promo_name: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  volume_ml: number | null;
};

const STATUS_LABELS: Record<GuestOrder["status"], string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  cancelled: "Annulée",
};

function CommandesPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | GuestOrder["status"]>("pending");
  const [detail, setDetail] = useState<GuestOrder | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["guest-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as GuestOrder[];
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["guest-order-items", detail?.id],
    enabled: Boolean(detail?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_order_items")
        .select("id,perfume_name,promo_name,quantity,unit_price,total,volume_ml")
        .eq("order_id", detail!.id);
      if (error) throw error;
      return data as GuestOrderItem[];
    },
  });

  const filtered = useMemo(
    () => orders.filter((o) => statusFilter === "all" || o.status === statusFilter),
    [orders, statusFilter],
  );

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: GuestOrder["status"] }) => {
      const { error } = await supabase.from("guest_orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: ["guest-orders"] });
      setDetail((prev) => (prev ? { ...prev, status: statusFilter === "all" ? prev.status : prev.status } : prev));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-gradient-gold">Commandes clients</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Commandes passées depuis le catalogue public (sans compte)
          </p>
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="confirmed">Confirmées</SelectItem>
            <SelectItem value="cancelled">Annulées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Détail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      Aucune commande
                    </TableCell>
                  </TableRow>
                ) : filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="text-xs whitespace-nowrap">{fDate(o.created_at)}</TableCell>
                    <TableCell className="font-medium">{o.customer_name}</TableCell>
                    <TableCell>
                      <a href={`tel:${o.customer_phone}`} className="text-sm text-gold hover:underline">
                        {o.customer_phone}
                      </a>
                    </TableCell>
                    <TableCell className="text-right font-medium">{fXOF(o.total)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          o.status === "pending"
                            ? "bg-warning/20 text-warning border-warning/30"
                            : o.status === "confirmed"
                              ? "bg-success/20 text-success border-success/30"
                              : ""
                        }
                      >
                        {STATUS_LABELS[o.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setDetail(o)}>Voir</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(detail)} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Commande {detail?.id.slice(0, 8).toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Client :</span> {detail.customer_name}</p>
                <p>
                  <span className="text-muted-foreground">Tél :</span>{" "}
                  <a className="text-gold hover:underline" href={`tel:${detail.customer_phone}`}>{detail.customer_phone}</a>
                </p>
                {detail.notes && <p><span className="text-muted-foreground">Note :</span> {detail.notes}</p>}
                <p><span className="text-muted-foreground">Total :</span> {fXOF(detail.total)}</p>
              </div>
              <div className="space-y-2">
                {items.map((it) => (
                  <div key={it.id} className="flex justify-between gap-2 text-sm border-b border-border/40 pb-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{it.perfume_name}</div>
                      {it.promo_name && <div className="text-[10px] text-gold">{it.promo_name}</div>}
                      <div className="text-xs text-muted-foreground">
                        {it.quantity} × {fXOF(it.unit_price)}
                        {it.volume_ml ? ` · ${it.volume_ml} ml` : ""}
                      </div>
                    </div>
                    <div className="font-medium shrink-0">{fXOF(it.total)}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {detail.status !== "confirmed" && (
                  <Button
                    className="bg-gradient-gold text-primary-foreground"
                    onClick={() => {
                      updateStatus.mutate({ id: detail.id, status: "confirmed" });
                      setDetail({ ...detail, status: "confirmed" });
                    }}
                  >
                    Confirmer
                  </Button>
                )}
                {detail.status !== "cancelled" && (
                  <Button
                    variant="outline"
                    className="text-destructive"
                    onClick={() => {
                      updateStatus.mutate({ id: detail.id, status: "cancelled" });
                      setDetail({ ...detail, status: "cancelled" });
                    }}
                  >
                    Annuler
                  </Button>
                )}
                {detail.status !== "pending" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      updateStatus.mutate({ id: detail.id, status: "pending" });
                      setDetail({ ...detail, status: "pending" });
                    }}
                  >
                    Remettre en attente
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
