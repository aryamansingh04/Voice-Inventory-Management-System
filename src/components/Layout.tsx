import { Link, useLocation } from "react-router-dom";
import { Home, PlusCircle, RefreshCw, List, Mic } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/add-product", label: "Add Product", icon: PlusCircle },
  { to: "/update-stock", label: "Update Stock", icon: RefreshCw },
  { to: "/inventory", label: "Inventory", icon: List },
  { to: "/voice", label: "Voice", icon: Mic },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-bold text-foreground">
            📦 My Inventory
          </Link>
          <ThemeToggle />
        </div>
        <nav className="mx-auto max-w-5xl overflow-x-auto px-4 pb-2">
          <div className="flex gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
