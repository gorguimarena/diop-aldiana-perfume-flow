import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normalizeSenegalPhone, PHONE_ERROR } from "@/lib/phone";

const itemSchema = z.object({
  perfume_id: z.string().uuid().nullable(),
  perfume_name: z.string().trim().min(1).max(200),
  promo_id: z.string().uuid().nullable().optional(),
  promo_name: z.string().trim().max(200).nullable().optional(),
  quantity: z.number().int().positive().max(100),
  unit_price: z.number().nonnegative(),
  total: z.number().nonnegative(),
  volume_ml: z.number().int().positive().nullable().optional(),
});

const createGuestOrderSchema = z.object({
  customer_name: z.string().trim().min(2).max(120),
  customer_phone: z
    .string()
    .trim()
    .transform((value, ctx) => {
      const normalized = normalizeSenegalPhone(value);
      if (!normalized) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: PHONE_ERROR });
        return z.NEVER;
      }
      return normalized;
    }),
  notes: z.string().trim().max(500).optional().nullable(),
  items: z.array(itemSchema).min(1).max(50),
});

export const createGuestOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createGuestOrderSchema.parse(input))
  .handler(async ({ data }) => {
    const total = data.items.reduce((acc, it) => acc + Number(it.total), 0);

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("guest_orders")
      .insert({
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        notes: data.notes?.trim() || null,
        total,
        status: "pending",
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      throw new Error(orderErr?.message ?? "Impossible de créer la commande");
    }

    const rows = data.items.map((it) => ({
      order_id: order.id,
      perfume_id: it.perfume_id,
      perfume_name: it.perfume_name,
      promo_id: it.promo_id ?? null,
      promo_name: it.promo_name ?? null,
      quantity: it.quantity,
      unit_price: it.unit_price,
      total: it.total,
      volume_ml: it.volume_ml ?? null,
    }));

    const { error: itemsErr } = await supabaseAdmin.from("guest_order_items").insert(rows);
    if (itemsErr) {
      await supabaseAdmin.from("guest_orders").delete().eq("id", order.id);
      throw new Error(itemsErr.message);
    }

    return { id: order.id as string, total };
  });
