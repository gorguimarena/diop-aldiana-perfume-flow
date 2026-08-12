import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useCart } from "@/components/cart-provider";
import { createGuestOrder } from "@/lib/guest-orders.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { fXOF } from "@/lib/format";
import { isValidSenegalPhone, normalizeSenegalPhone, PHONE_ERROR } from "@/lib/phone";
import { Minus, Plus, Trash2 } from "lucide-react";

type CartCheckoutSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CartCheckoutSheet({ open, onOpenChange }: CartCheckoutSheetProps) {
  const { items, total, setQuantity, removeItem, clear } = useCart();
  const createOrder = useServerFn(createGuestOrder);
  const [step, setStep] = useState<"cart" | "checkout" | "done">("cart");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setTimeout(() => {
        setStep(items.length ? "cart" : "cart");
        if (orderId) {
          setOrderId(null);
          setName("");
          setPhone("");
          setNotes("");
        }
      }, 200);
    }
  };

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!items.length) return toast.error("Panier vide");
    if (name.trim().length < 2) return toast.error("Indiquez votre nom complet");
    if (!isValidSenegalPhone(phone)) return toast.error(PHONE_ERROR);

    const normalizedPhone = normalizeSenegalPhone(phone)!;
    setSaving(true);
    try {
      const result = await createOrder({
        data: {
          customer_name: name.trim(),
          customer_phone: normalizedPhone,
          notes: notes.trim() || null,
          items: items.map((it) => ({
            perfume_id: it.perfume_id,
            perfume_name: it.perfume_name,
            promo_id: it.promo_id ?? null,
            promo_name: it.promo_name ?? null,
            quantity: it.quantity,
            unit_price: it.unit_price,
            total: it.unit_price * it.quantity,
            volume_ml: it.volume_ml ?? null,
          })),
        },
      });
      setOrderId(result.id);
      clear();
      setStep("done");
      toast.success("Commande envoyée");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la commande");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">
            {step === "done" ? "Merci !" : step === "checkout" ? "Vos coordonnées" : "Panier"}
          </SheetTitle>
          <SheetDescription>
            {step === "done"
              ? "Nous vous contacterons pour confirmer la livraison."
              : step === "checkout"
                ? "Pas besoin de compte — nom et téléphone suffisent."
                : "Ajoutez des parfums puis validez votre commande."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {step === "cart" && (
            items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Votre panier est vide</p>
            ) : (
              items.map((it) => (
                <div key={it.key} className="flex gap-3 rounded-md border border-border/60 p-2">
                  <div className="h-14 w-14 shrink-0 rounded overflow-hidden bg-muted/40">
                    {it.image_url ? <img src={it.image_url} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{it.perfume_name}</div>
                    {it.promo_name && (
                      <div className="text-[10px] text-gold truncate">{it.promo_name}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-0.5">{fXOF(it.unit_price)}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => setQuantity(it.key, it.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm w-6 text-center">{it.quantity}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => setQuantity(it.key, it.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 ml-auto text-destructive"
                        onClick={() => removeItem(it.key)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )
          )}

          {step === "checkout" && (
            <form id="guest-checkout" onSubmit={submitOrder} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="guest-name">Nom complet *</Label>
                <Input
                  id="guest-name"
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex. Aminata Diallo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-phone">Téléphone *</Label>
                <Input
                  id="guest-phone"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex. 77 123 45 67"
                  inputMode="tel"
                  autoComplete="tel"
                  aria-invalid={phone.length > 0 && !isValidSenegalPhone(phone)}
                />
                {phone.length > 0 && !isValidSenegalPhone(phone) && (
                  <p className="text-xs text-destructive">{PHONE_ERROR}</p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Mobile sénégalais : 70 / 75 / 76 / 77 / 78…
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-notes">Note (optionnel)</Label>
                <Textarea
                  id="guest-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Adresse, horaire…"
                />
              </div>
              <div className="rounded-md border border-gold/30 bg-gold/5 p-3 text-sm flex justify-between">
                <span>Total</span>
                <span className="font-display text-lg text-gradient-gold">{fXOF(total)}</span>
              </div>
            </form>
          )}

          {step === "done" && (
            <div className="space-y-3 text-center py-6">
              <p className="text-sm text-muted-foreground">
                Référence : <span className="font-mono text-foreground">{orderId?.slice(0, 8).toUpperCase()}</span>
              </p>
              <p className="text-sm">Nous vous rappelons bientôt au numéro indiqué.</p>
            </div>
          )}
        </div>

        <SheetFooter className="gap-2 sm:flex-col">
          {step === "cart" && (
            <>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium">{fXOF(total)}</span>
              </div>
              <Button
                disabled={!items.length}
                className="w-full bg-gradient-gold text-primary-foreground"
                onClick={() => setStep("checkout")}
              >
                Commander
              </Button>
            </>
          )}
          {step === "checkout" && (
            <>
              <Button
                type="submit"
                form="guest-checkout"
                disabled={saving || !isValidSenegalPhone(phone) || name.trim().length < 2}
                className="w-full bg-gradient-gold text-primary-foreground"
              >
                {saving ? "Envoi…" : "Confirmer la commande"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setStep("cart")}>
                Retour au panier
              </Button>
            </>
          )}
          {step === "done" && (
            <Button className="w-full" onClick={() => handleOpenChange(false)}>
              Continuer le catalogue
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
