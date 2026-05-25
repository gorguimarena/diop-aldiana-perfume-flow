#!/usr/bin/env node
/**
 * Script d'initialisation du premier administrateur.
 *
 * Usage :
 *   node scripts/init-admin.mjs <email> <password> "<nom complet>"
 *
 * Variables d'environnement requises (déjà disponibles via Lovable Cloud) :
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Le script :
 *   1. Crée (ou récupère) le compte utilisateur — email auto-confirmé
 *   2. S'assure que le profil existe (nom complet)
 *   3. Lui attribue le rôle "admin"
 */
import { createClient } from "@supabase/supabase-js";

const [, , emailArg, passwordArg, ...nameParts] = process.argv;
const fullName = nameParts.join(" ").trim() || "Administrateur";

if (!emailArg || !passwordArg) {
  console.error("Usage: node scripts/init-admin.mjs <email> <password> \"<nom complet>\"");
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Variables manquantes : SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  // 1. Créer ou retrouver le user
  let userId;
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: emailArg,
    password: passwordArg,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (cErr) {
    if (/already|registered|exists/i.test(cErr.message)) {
      console.log("ℹ︎  Utilisateur déjà existant — récupération…");
      const { data: list, error: lErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (lErr) throw lErr;
      const found = list.users.find((u) => u.email?.toLowerCase() === emailArg.toLowerCase());
      if (!found) throw new Error("Utilisateur introuvable");
      userId = found.id;
      // mettre à jour le mot de passe
      await admin.auth.admin.updateUserById(userId, {
        password: passwordArg,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
    } else {
      throw cErr;
    }
  } else {
    userId = created.user.id;
    console.log("✓ Compte créé");
  }

  // 2. Upsert profil
  const { error: pErr } = await admin
    .from("profiles")
    .upsert({ id: userId, email: emailArg, full_name: fullName }, { onConflict: "id" });
  if (pErr) throw pErr;
  console.log("✓ Profil enregistré");

  // 3. Attribuer rôle admin (supprime les autres rôles)
  await admin.from("user_roles").delete().eq("user_id", userId);
  const { error: rErr } = await admin.from("user_roles").insert({ user_id: userId, role: "admin" });
  if (rErr) throw rErr;
  console.log("✓ Rôle admin attribué");

  console.log(`\n🎉 Admin prêt : ${emailArg}`);
}

main().catch((e) => {
  console.error("❌", e.message ?? e);
  process.exit(1);
});
