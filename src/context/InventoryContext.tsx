import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Product, LOW_STOCK_THRESHOLD } from "@/types/inventory";

const INITIAL_PRODUCTS: Product[] = [
  { id: "1", name: "Wireless Mouse", category: "Electronics", quantity: 45 },
  { id: "2", name: "USB-C Cable", category: "Accessories", quantity: 8 },
  { id: "3", name: "Desk Lamp", category: "Furniture", quantity: 3 },
  { id: "4", name: "Notebook A5", category: "Stationery", quantity: 120 },
  { id: "5", name: "Keyboard", category: "Electronics", quantity: 5 },
];

interface InventoryContextType {
  products: Product[];
  addProduct: (product: Omit<Product, "id">) => void;
  updateStock: (nameOrId: string, delta: number) => string;
  deleteProduct: (id: string) => void;
  totalOrders: number;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [totalOrders, setTotalOrders] = useState(12);

  const addProduct = useCallback((product: Omit<Product, "id">) => {
    setProducts((prev) => [...prev, { ...product, id: crypto.randomUUID() }]);
    setTotalOrders((o) => o + 1);
  }, []);

  const updateStock = useCallback(
    (nameOrId: string, delta: number): string => {
      const search = nameOrId.toLowerCase().trim();
      let found = false;
      let resultMsg = "";

      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === nameOrId || p.name.toLowerCase() === search) {
            found = true;
            const newQty = Math.max(0, p.quantity + delta);
            resultMsg = `${p.name} updated: ${p.quantity} → ${newQty}`;
            return { ...p, quantity: newQty };
          }
          return p;
        })
      );

      if (!found) return "Product not found. Please check the name and try again.";
      setTotalOrders((o) => o + 1);
      return resultMsg;
    },
    []
  );

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return (
    <InventoryContext.Provider value={{ products, addProduct, updateStock, deleteProduct, totalOrders }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}
