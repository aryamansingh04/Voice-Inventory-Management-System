import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Product, LOW_STOCK_THRESHOLD } from "@/types/inventory";

const INITIAL_PRODUCTS: Product[] = [
  { id: "1", name: "Wireless Mouse", category: "Electronics", quantity: 45, description: "Ergonomic wireless mouse with USB receiver" },
  { id: "2", name: "USB-C Cable", category: "Accessories", quantity: 8, description: "1m braided USB-C charging cable" },
  { id: "3", name: "Desk Lamp", category: "Furniture", quantity: 3, description: "Adjustable LED desk lamp" },
  { id: "4", name: "Notebook A5", category: "Stationery", quantity: 120, description: "Ruled notebook, 200 pages" },
  { id: "5", name: "Keyboard", category: "Electronics", quantity: 5, description: "Mechanical keyboard with backlight" },
  { id: "6", name: "Pen Set", category: "Stationery", quantity: 60, description: "Pack of 10 ballpoint pens" },
  { id: "7", name: "Monitor Stand", category: "Furniture", quantity: 2, description: "Wooden monitor riser stand" },
  { id: "8", name: "Phone Case", category: "Accessories", quantity: 35, description: "Silicone phone case, universal fit" },
];

export interface ActivityEntry {
  id: string;
  message: string;
  time: Date;
}

interface InventoryContextType {
  products: Product[];
  activities: ActivityEntry[];
  addProduct: (product: Omit<Product, "id">) => void;
  updateStock: (nameOrId: string, newQuantity: number) => string;
  adjustStock: (nameOrId: string, delta: number) => string;
  deleteProduct: (id: string) => void;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [activities, setActivities] = useState<ActivityEntry[]>([
    { id: "a1", message: "System started", time: new Date() },
  ]);

  const addActivity = (message: string) => {
    setActivities((prev) => [{ id: crypto.randomUUID(), message, time: new Date() }, ...prev].slice(0, 20));
  };

  const addProduct = useCallback((product: Omit<Product, "id">) => {
    setProducts((prev) => [...prev, { ...product, id: crypto.randomUUID() }]);
    addActivity(`Added "${product.name}" (${product.quantity} units)`);
  }, []);

  const findProduct = (nameOrId: string) => {
    const search = nameOrId.toLowerCase().trim();
    return (p: Product) => p.id === nameOrId || p.name.toLowerCase() === search;
  };

  const updateStock = useCallback((nameOrId: string, newQuantity: number): string => {
    const matcher = findProduct(nameOrId);
    let resultMsg = "Product not found. Please check the name and try again.";

    setProducts((prev) =>
      prev.map((p) => {
        if (matcher(p)) {
          resultMsg = `✅ ${p.name}: quantity set to ${newQuantity}`;
          return { ...p, quantity: Math.max(0, newQuantity) };
        }
        return p;
      })
    );

    if (!resultMsg.startsWith("Product")) addActivity(resultMsg);
    return resultMsg;
  }, []);

  const adjustStock = useCallback((nameOrId: string, delta: number): string => {
    const matcher = findProduct(nameOrId);
    let resultMsg = "Product not found. Please check the name and try again.";

    setProducts((prev) =>
      prev.map((p) => {
        if (matcher(p)) {
          const newQty = Math.max(0, p.quantity + delta);
          resultMsg = `✅ ${p.name}: ${p.quantity} → ${newQty}`;
          return { ...p, quantity: newQty };
        }
        return p;
      })
    );

    if (!resultMsg.startsWith("Product")) addActivity(resultMsg);
    return resultMsg;
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => {
      const p = prev.find((x) => x.id === id);
      if (p) addActivity(`Removed "${p.name}"`);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  return (
    <InventoryContext.Provider value={{ products, activities, addProduct, updateStock, adjustStock, deleteProduct }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}
