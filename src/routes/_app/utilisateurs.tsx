import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";
import { fDate } from "@/lib/format";
import { ShieldCheck, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/_app/utilisateurs")({ component: UsersPage });

type Row = {
  id: string; full_name: string | null; email: string | null;
  created_at: string; role: "admin" | "vendeur" | null;
};

function UsersPage() {
  const { role, user: me } = useAuth();
  const qc = useQueryClient();

  if (role && role !== "admin") return <Navigate to="/dashboard" replace />;

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      const [{ data: profiles, error: pe }, { data: roles, error: re }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email,created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      if (pe) throw pe; if (re) throw re;
      const map = new Map<string, "admin" | "vendeur">();
      (roles ?? []).forEach((r) => {
        const cur = map.get(r.user_id);
        if (r.role === "admin" || !cur) map.set(r.user_id, r.role);
      });
      return (profiles ?? []).map((p) => ({ ...p, role: map.get(p.id) ?? null })) as Row[];
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ uid, role: r }: { uid: string; role: "admin" | "vendeur" }) => {
      await supabase.from("user_roles").delete().eq("user_id", uid);
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: r });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rôle mis à jour"); qc.invalidateQueries({ queryKey: ["users-with-roles"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-gradient-gold">Utilisateurs</h1>
        <p className="text-muted-foreground text-sm mt-1">{rows.length} comptes — gestion des rôles</p>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-xs">{fDate(u.created_at)}</TableCell>
                    <TableCell>
                      {u.role === "admin" ? (
                        <Badge className="bg-gold/20 text-gold border-gold/30 gap-1">
                          <ShieldCheck className="h-3 w-3" />Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1"><UserIcon className="h-3 w-3" />Vendeur</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.id === me?.id ? (
                        <span className="text-xs text-muted-foreground">vous</span>
                      ) : (
                        <Select
                          value={u.role ?? "vendeur"}
                          onValueChange={(v) => setRole.mutate({ uid: u.id, role: v as "admin" | "vendeur" })}
                        >
                          <SelectTrigger className="w-32 ml-auto"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vendeur">Vendeur</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">Aucun utilisateur</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Button variant="ghost" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["users-with-roles"] })}>
        Rafraîchir
      </Button>
    </div>
  );
}
