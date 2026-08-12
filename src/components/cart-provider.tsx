import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  key: string;
  perfume_id: string | null;
  perfume_name: string;
  promo_id?: string | null;
  promo_name?: string | null;
  quantity: number;
  unit_price: number;
  volume_ml?: number | null;
  image_url?: string | null;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  addItem: (item: Omit<CartItem, "key"> & { key?: string }) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "diop-aldiana-cart";
const CartContext = createContext<CartContextValue | null>(null);

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(loadCart());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const addItem = useCallback((item: Omit<CartItem, "key"> & { key?: string }) => {
    const key =
      item.key ??
      (item.promo_id
        ? `promo:${item.promo_id}:${item.perfume_id}:${crypto.randomUUID()}`
        : `perfume:${item.perfume_id}`);

    setItems((prev) => {
      if (item.promo_id) {
        return [...prev, { ...item, key, quantity: item.quantity }];
      }
      const existing = prev.find((x) => x.key === key && !x.promo_id);
      if (existing) {
        return prev.map((x) =>
          x.key === key ? { ...x, quantity: x.quantity + item.quantity } : x,
        );
      }
      return [...prev, { ...item, key }];
    });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) =>
      prev
        .map((x) => (x.key === key ? { ...x, quantity } : x))
        .filter((x) => x.quantity > 0),
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((x) => x.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const total = items.reduce((acc, it) => acc + it.unit_price * it.quantity, 0);
    const count = items.reduce((acc, it) => acc + it.quantity, 0);
    return { items, count, total, addItem, setQuantity, removeItem, clear };
  }, [items, addItem, setQuantity, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
