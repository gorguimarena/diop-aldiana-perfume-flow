import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fXOF, fNum, PAYMENT_LABELS } from "@/lib/format";
import {
  Banknote, TrendingUp, Package, ShoppingBag, AlertTriangle, Sparkles,
} from "lucide-react";
import {
  Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

type Sale = {
  id: string; total: number; profit: number; payment_method: string;
  perfume_name: string; quantity: number; created_at: string;
};
type Perfume = { id: string; name: string; stock_quantity: number; low_stock_threshold: number };

function Dashboard() {
  const { data: sales = [] } = useQuery({
    queryKey: ["sales", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id,total,profit,payment_method,perfume_name,quantity,created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as Sale[];
    },
  });

  const { data: perfumes = [] } = useQuery({
    queryKey: ["perfumes", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfumes")
        .select("id,name,stock_quantity,low_stock_threshold");
      if (error) throw error;
      return data as Perfume[];
    },
  });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const todaySales = sales.filter((s) => new Date(s.created_at) >= today);
  const monthSales = sales.filter((s) => new Date(s.created_at) >= startMonth);
  const caToday = todaySales.reduce((a, s) => a + Number(s.total), 0);
  const caMonth = monthSales.reduce((a, s) => a + Number(s.total), 0);
  const profitMonth = monthSales.reduce((a, s) => a + Number(s.profit), 0);

  const totalStock = perfumes.reduce((a, p) => a + p.stock_quantity, 0);
  const lowStock = perfumes.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold);
  const outOfStock = perfumes.filter((p) => p.stock_quantity === 0);

  // top sold
  const topMap = new Map<string, number>();
  sales.forEach((s) => topMap.set(s.perfume_name, (topMap.get(s.perfume_name) ?? 0) + s.quantity));
  const top = [...topMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty }));

  // 7 days
  const days: { d: string; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const total = sales.filter((s) => {
      const t = new Date(s.created_at); return t >= d && t < next;
    }).reduce((a, s) => a + Number(s.total), 0);
    days.push({ d: d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit" }), total });
  }

  // payment breakdown
  const payMap = new Map<string, number>();
  monthSales.forEach((s) => payMap.set(s.payment_method, (payMap.get(s.payment_method) ?? 0) + Number(s.total)));
  const payData = [...payMap.entries()].map(([k, v]) => ({ name: PAYMENT_LABELS[k] ?? k, value: v }));
  const COLORS = ["var(--gold)", "var(--gold-soft)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-gradient-gold">Tableau de bord</h1>
        <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble des ventes et du stock</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Banknote} label="Chiffre d'affaires du jour" value={fXOF(caToday)} sub={`${todaySales.length} ventes`} />
        <StatCard icon={TrendingUp} label="Ventes du mois" value={fXOF(caMonth)} sub={`${monthSales.length} ventes`} />
        <StatCard icon={Sparkles} label="Bénéfices du mois" value={fXOF(profitMonth)} accent />
        <StatCard icon={Package} label="Parfums en stock" value={fNum(totalStock)} sub={`${perfumes.length} références`} />
      </div>

      {(lowStock.length > 0 || outOfStock.length > 0) && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Alertes stock
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {outOfStock.map((p) => (
              <Badge key={p.id} variant="destructive">Rupture : {p.name}</Badge>
            ))}
            {lowStock.map((p) => (
              <Badge key={p.id} className="bg-warning/20 text-warning border-warning/30">
                Faible : {p.name} ({p.stock_quantity})
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Ventes des 7 derniers jours</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <BarChart data={days}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                  formatter={(v: number) => fXOF(v)}
                />
                <Bar dataKey="total" fill="var(--gold)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Moyens de paiement (mois)</CardTitle></CardHeader>
          <CardContent className="h-72">
            {payData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Aucune vente</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={payData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                    {payData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fXOF(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-gold" />Top parfums vendus</CardTitle>
        </CardHeader>
        <CardContent>
          {top.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Aucune vente enregistrée</div>
          ) : (
            <ol className="space-y-2">
              {top.map((t, i) => (
                <li key={t.name} className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-xl text-gold w-6">{i + 1}</span>
                    <span className="font-medium">{t.name}</span>
                  </div>
                  <Badge variant="secondary">{t.qty} vendus</Badge>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, sub, accent,
}: { icon: React.ElementType; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <Card className={accent ? "border-gold/40 bg-gradient-to-br from-gold/5 to-transparent" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
            <div className="font-display text-2xl mt-2 truncate">{value}</div>
            {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
          </div>
          <div className="h-10 w-10 rounded-md bg-gold/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-gold" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
