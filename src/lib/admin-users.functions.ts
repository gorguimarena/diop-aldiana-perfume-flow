import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const createEmployeeSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  full_name: z.string().trim().min(1).max(120),
  role: z.enum(["admin", "vendeur"]).default("vendeur"),
});

export const createEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createEmployeeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // Verify caller is admin
    const { data: roles, error: re } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (re) throw new Error(re.message);
    if (!roles?.some((r) => r.role === "admin")) {
      throw new Error("Réservé aux administrateurs");
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error) throw new Error(error.message);
    const newId = created.user!.id;

    // Ensure role is the requested one (trigger may have assigned vendeur)
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newId, role: data.role });
    if (rErr) throw new Error(rErr.message);

    return { id: newId };
  });

const deleteEmployeeSchema = z.object({ user_id: z.string().uuid() });

export const deleteEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteEmployeeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    if (userId === data.user_id) throw new Error("Impossible de se supprimer soi-même");
    const { data: roles, error: re } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (re) throw new Error(re.message);
    if (!roles?.some((r) => r.role === "admin")) {
      throw new Error("Réservé aux administrateurs");
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
