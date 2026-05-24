import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { fDate, fXOF, PAYMENT_LABELS } from "@/lib/format";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/historique")({ component: HistoriquePage });

type Sale = {
  id: string; perfume_name: string; quantity: number; unit_price: number;
  total: number; profit: number; payment_method: string;
  seller_id: string; seller_name: string | null; customer_name: string | null;
  created_at: string;
};

function HistoriquePage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [seller, setSeller] = useState("all");
  const [payment, setPayment] = useState("all");

  const { data: sales = [] } = useQuery({
    queryKey: ["sales", "history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales").select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as Sale[];
    },
  });

  const sellers = useMemo(() => {
    const map = new Map<string, string>();
    sales.forEach((s) => map.set(s.seller_id, s.seller_name ?? "Inconnu"));
    return [...map.entries()];
  }, [sales]);

  const filtered = useMemo(() => sales.filter((s) => {
    const d = new Date(s.created_at);
    if (from && d < new Date(from)) return false;
    if (to) { const t = new Date(to); t.setHours(23, 59, 59); if (d > t) return false; }
    if (seller !== "all" && s.seller_id !== seller) return false;
    if (payment !== "all" && s.payment_method !== payment) return false;
    return true;
  }), [sales, from, to, seller, payment]);

  const totals = useMemo(() => ({
    count: filtered.length,
    ca: filtered.reduce((a, s) => a + Number(s.total), 0),
    profit: filtered.reduce((a, s) => a + Number(s.profit), 0),
  }), [filtered]);

  const exportXLSX = () => {
    const rows = filtered.map((s) => ({
      Date: fDate(s.created_at),
      Parfum: s.perfume_name,
      Quantité: s.quantity,
      "Prix unitaire": Number(s.unit_price),
      Total: Number(s.total),
      Bénéfice: Number(s.profit),
      Paiement: PAYMENT_LABELS[s.payment_method] ?? s.payment_method,
      Vendeur: s.seller_name ?? "",
      Client: s.customer_name ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventes");
    XLSX.writeFile(wb, `ventes-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Export Excel généré");
  };

  const invoice = (s: Sale) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Diop Aldiana Parfumerie", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text("Facture de vente", 14, 27);
    doc.setTextColor(0);
    doc.text(`N° ${s.id.slice(0, 8).toUpperCase()}`, 150, 20);
    doc.text(fDate(s.created_at), 150, 27);

    doc.setFontSize(11);
    doc.text(`Vendeur : ${s.seller_name ?? "—"}`, 14, 45);
    if (s.customer_name) doc.text(`Client : ${s.customer_name}`, 14, 52);

    autoTable(doc, {
      startY: 65,
      head: [["Parfum", "Qté", "Prix unit.", "Total"]],
      body: [[s.perfume_name, String(s.quantity), fXOF(s.unit_price), fXOF(s.total)]],
      theme: "grid",
      headStyles: { fillColor: [201, 168, 76] },
    });

    const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Total : ${fXOF(s.total)}`, 150, y);
    doc.setFontSize(10);
    doc.text(`Paiement : ${PAYMENT_LABELS[s.payment_method] ?? s.payment_method}`, 14, y);

    doc.save(`facture-${s.id.slice(0, 8)}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-gradient-gold">Historique des ventes</h1>
          <p className="text-muted-foreground text-sm mt-1">{totals.count} ventes — CA {fXOF(totals.ca)} — Bénéfice {fXOF(totals.profit)}</p>
        </div>
        <Button onClick={exportXLSX} variant="outline">
          <FileSpreadsheet className="h-4 w-4 mr-1" /> Exporter Excel
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Du</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Au</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Vendeur</Label>
            <Select value={seller} onValueChange={setSeller}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {sellers.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Paiement</Label>
            <Select value={payment} onValueChange={setPayment}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {Object.entries(PAYMENT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Parfum</TableHead>
                <TableHead className="text-right">Qté</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Bénéfice</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead>Vendeur</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Facture</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-10">Aucune vente</TableCell></TableRow>
              ) : filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="whitespace-nowrap text-xs">{fDate(s.created_at)}</TableCell>
                  <TableCell className="font-medium">{s.perfume_name}</TableCell>
                  <TableCell className="text-right">{s.quantity}</TableCell>
                  <TableCell className="text-right font-medium">{fXOF(s.total)}</TableCell>
                  <TableCell className="text-right text-success">{fXOF(s.profit)}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{PAYMENT_LABELS[s.payment_method] ?? s.payment_method}</Badge></TableCell>
                  <TableCell className="text-xs">{s.seller_name ?? "—"}</TableCell>
                  <TableCell className="text-xs">{s.customer_name ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => invoice(s)} title="Imprimer la facture">
                      <Printer className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
