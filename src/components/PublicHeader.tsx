import { Link } from "@tanstack/react-router";
import { ShoppingBag, Sparkles, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-provider";
import { useAuth } from "@/components/auth-provider";

type PublicHeaderProps = {
  onOpenCart: () => void;
};

export function PublicHeader({ onOpenCart }: PublicHeaderProps) {
  const { count } = useCart();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-md bg-gradient-gold flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <div className="font-display text-lg leading-tight text-gradient-gold truncate">Diop Aldiana</div>
            <div className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground">Catalogue</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onOpenCart} className="relative gap-1.5">
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Panier</span>
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 rounded-full bg-gold px-1 text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                {count}
              </span>
            )}
          </Button>
          {user ? (
            <Button asChild size="sm" className="bg-gradient-gold text-primary-foreground">
              <Link to="/dashboard">Espace pro</Link>
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link to="/login" className="gap-1.5">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Staff</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
