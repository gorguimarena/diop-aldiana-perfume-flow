import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";
import { fDate } from "@/lib/format";
import { ShieldCheck, User as UserIcon, UserPlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { createEmployee, deleteEmployee } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/_app/utilisateurs")({ component: UsersPage });

type Row = {
  id: string; full_name: string | null; email: string | null;
  created_at: string; role: "admin" | "vendeur" | null;
};

function UsersPage() {
  const { role, user: me } = useAuth();
  const qc = useQueryClient();
  const createEmp = useServerFn(createEmployee);
  const deleteEmp = useServerFn(deleteEmployee);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "vendeur">("vendeur");

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

  const createMut = useMutation({
    mutationFn: async () => {
      await createEmp({
        data: {
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          role: newRole,
        },
      });
    },
    onSuccess: () => {
      toast.success("Compte créé");
      setFullName(""); setEmail(""); setPassword(""); setNewRole("vendeur");
      qc.invalidateQueries({ queryKey: ["users-with-roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (uid: string) => { await deleteEmp({ data: { user_id: uid } }); },
    onSuccess: () => { toast.success("Compte supprimé"); qc.invalidateQueries({ queryKey: ["users-with-roles"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Mot de passe : 8 caractères minimum");
    createMut.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-gradient-gold">Utilisateurs</h1>
        <p className="text-muted-foreground text-sm mt-1">{rows.length} comptes — gestion des employés et des rôles</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-gold" /> Ajouter un employé</CardTitle>
          <CardDescription>Crée un compte de connexion. Par défaut : rôle vendeur (pas d'accès à cette page).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nfn">Nom complet</Label>
              <Input id="nfn" required value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nem">Email</Label>
              <Input id="nem" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="npw">Mot de passe (min 8)</Label>
              <Input id="npw" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as "admin" | "vendeur")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendeur">Vendeur</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={createMut.isPending} className="bg-gradient-gold text-primary-foreground hover:opacity-90">
                {createMut.isPending ? "Création…" : "Créer le compte"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

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
                  <TableHead className="text-right">Actions</TableHead>
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
                        <div className="flex items-center gap-2 justify-end">
                          <Select
                            value={u.role ?? "vendeur"}
                            onValueChange={(v) => setRole.mutate({ uid: u.id, role: v as "admin" | "vendeur" })}
                          >
                            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="vendeur">Vendeur</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer ce compte ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible. L'utilisateur perdra l'accès immédiatement.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => delMut.mutate(u.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
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
    </div>
  );
}
