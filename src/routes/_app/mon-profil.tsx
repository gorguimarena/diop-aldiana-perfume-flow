import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/mon-profil")({ component: ProfilePage });

function ProfilePage() {
  const { user, profile, role, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setEmail(profile?.email ?? user?.email ?? "");
  }, [profile, user]);

  const onSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingInfo(true);
    const trimmedEmail = email.trim();
    const { error: pe } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), email: trimmedEmail })
      .eq("id", user.id);
    let emailErr: string | null = null;
    const emailChanged = trimmedEmail && trimmedEmail !== user.email;
    if (emailChanged) {
      const { error } = await supabase.auth.updateUser({ email: trimmedEmail });
      if (error) emailErr = error.message;
    }
    setSavingInfo(false);
    if (pe) return toast.error(pe.message);
    if (emailErr) return toast.error(emailErr);
    await refreshProfile();
    toast.success(
      emailChanged
        ? "Profil mis à jour — confirmez le nouvel email si un message vous a été envoyé."
        : "Profil mis à jour",
    );
  };

  const onChangePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Minimum 8 caractères");
    if (password !== confirm) return toast.error("Les mots de passe ne correspondent pas");
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPw(false);
    if (error) return toast.error(error.message);
    setPassword(""); setConfirm("");
    toast.success("Mot de passe modifié");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-4xl text-gradient-gold">Mon profil</h1>
        <p className="text-muted-foreground text-sm mt-1 uppercase tracking-wider">{role}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
          <CardDescription>Nom complet et adresse email</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSaveInfo} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fn">Nom complet</Label>
              <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="em">Email</Label>
              <Input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <p className="text-xs text-muted-foreground">Un email de confirmation peut être envoyé si vous changez d'adresse.</p>
            </div>
            <Button type="submit" disabled={savingInfo} className="bg-gradient-gold text-primary-foreground hover:opacity-90">
              {savingInfo ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mot de passe</CardTitle>
          <CardDescription>Modifier votre mot de passe (minimum 8 caractères)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onChangePw} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw">Nouveau mot de passe</Label>
              <Input id="pw" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw2">Confirmation</Label>
              <Input id="pw2" type="password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <Button type="submit" disabled={savingPw} variant="secondary">
              {savingPw ? "Modification…" : "Changer le mot de passe"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
