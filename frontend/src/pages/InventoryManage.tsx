import { useEffect, useRef, useState } from "react";
import { RefreshCw, Mic, MicOff, CheckCircle, AlertCircle, Search } from "lucide-react";
import { useInventory } from "@/context/InventoryContext";
import { LOW_STOCK_THRESHOLD } from "@/types/inventory";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { motion, AnimatePresence } from "framer-motion";

export default function InventoryManage() {
  const { products, updateStock, refreshProducts } = useInventory();
  const [editQty, setEditQty] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [quickText, setQuickText] = useState("");
  const [isQuickSubmitting, setIsQuickSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const { isListening, transcript, startListening, stopListening, resetTranscript, isSupported } = useSpeechRecognition();
  const latestTranscriptRef = useRef("");

  useEffect(() => {
    latestTranscriptRef.current = transcript;
  }, [transcript]);

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleRowUpdate = (id: string, name: string) => {
    const val = editQty[id];
    if (val === undefined || val === "") return;
    const quantity = parseInt(val, 10);
    if (Number.isNaN(quantity) || quantity < 0) {
      showFeedback("error", "Please enter a valid quantity (0 or more).");
      return;
    }

    void (async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5000"}/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ P_ID: id, quantity }),
        });
        const data = await response.json();

        if (!response.ok) {
          showFeedback("error", data.error || `Could not update ${name}.`);
          return;
        }

        updateStock(id, quantity);
        await refreshProducts();
        showFeedback("success", data.message || `${name} updated to ${quantity}`);
        setEditQty((prev) => ({ ...prev, [id]: "" }));
      } catch {
        showFeedback("error", "Could not reach backend update service.");
      }
    })();
  };

  const parseQuickUpdate = async (text: string) => {
    const cleanedText = text.trim();
    if (!cleanedText) return;

    const extractCommand = (command: string) => {
      const wordToNumber = (raw: string) => {
        const map: Record<string, number> = {
          zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
          ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
          seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
          sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
        };
        const tokens = raw.toLowerCase().trim().split(/\s+/).filter(Boolean);
        if (tokens.length === 0) return null;

        let total = 0;
        let current = 0;
        for (const token of tokens) {
          const value = map[token];
          if (value === undefined) return null;
          if (value === 100) {
            current = Math.max(1, current) * 100;
          } else {
            current += value;
          }
        }
        total += current;
        return Number.isFinite(total) ? total : null;
      };

      const patterns = [
        /(?:update|set|change)\s+(.+?)\s+(?:stock\s+)?to\s+(\d+|[a-z\s]+)$/i,
        /(?:update|set|change)\s+(.+?)\s+(\d+|[a-z\s]+)\s*$/i,
        /^(.+?)\s+(?:to\s+)?(\d+|[a-z\s]+)\s*$/i,
      ];

      for (const pattern of patterns) {
        const match = command.match(pattern);
        if (!match) continue;
        const productQuery = match[1].trim().toLowerCase();
        const rawQty = match[2].trim().toLowerCase();
        const numericQty = Number(rawQty);
        const quantity = Number.isNaN(numericQty) ? wordToNumber(rawQty) : numericQty;
        if (!productQuery || quantity === null || Number.isNaN(quantity)) continue;
        return { productQuery, quantity };
      }

      return null;
    };

    const resolveProduct = (productQuery: string) => {
      const normalized = productQuery.toLowerCase();
      return (
        products.find((p) => p.name.toLowerCase() === normalized) ||
        products.find((p) => p.name.toLowerCase().includes(normalized) || normalized.includes(p.name.toLowerCase()))
      );
    };

    setIsQuickSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5000"}/voice-command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanedText }),
      });
      const data = await response.json();

      if (!response.ok) {
        const parsed = extractCommand(cleanedText);
        if (!parsed) {
          showFeedback("error", data.error || "Couldn't understand that. Try: \"Update Mouse to 20\"");
          return;
        }

        const matchedProduct = resolveProduct(parsed.productQuery);
        if (!matchedProduct) {
          showFeedback("error", data.error || `No product matched "${parsed.productQuery}".`);
          return;
        }

        const fallbackResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5000"}/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ P_ID: matchedProduct.id, quantity: parsed.quantity }),
        });
        const fallbackData = await fallbackResponse.json();

        if (!fallbackResponse.ok) {
          showFeedback("error", fallbackData.error || "Update failed.");
          return;
        }

        updateStock(matchedProduct.id, parsed.quantity);
        await refreshProducts();
        showFeedback("success", fallbackData.message || `${matchedProduct.name} updated to ${parsed.quantity}`);
        return;
      }

      const productName = data?.product ? String(data.product) : "";
      const parsedQuantity = Number(data?.quantity);
      if (productName && !Number.isNaN(parsedQuantity)) {
        updateStock(productName, parsedQuantity);
      }
      await refreshProducts();
      showFeedback("success", data.message || "Stock updated successfully");
    } catch {
      showFeedback("error", "Could not reach backend voice service.");
    } finally {
      setIsQuickSubmitting(false);
    }
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickText.trim()) return;
    void parseQuickUpdate(quickText);
    setQuickText("");
  };

  const toggleMic = () => {
    if (isQuickSubmitting) return;
    if (isListening) {
      stopListening();
      setTimeout(() => {
        const latestText = latestTranscriptRef.current.trim();
        if (latestText) {
          setQuickText(latestText);
          void parseQuickUpdate(latestText);
          resetTranscript();
        } else {
          showFeedback("error", "No speech captured. Please try again.");
        }
      }, 400);
    } else {
      resetTranscript();
      startListening();
    }
  };

  const filtered = search.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Manage Stock</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update quantities for your products.</p>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex items-center gap-2 rounded-xl border p-4 text-sm font-medium ${
              feedback.type === "success"
                ? "border-success/30 bg-success/10 text-success"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {feedback.type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Update */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-5"
      >
        <h2 className="mb-3 font-semibold text-card-foreground">⚡ Quick Update</h2>
        <p className="mb-3 text-xs text-muted-foreground">Type or say something like: "Update Mouse to 20"</p>
        <form onSubmit={handleQuickSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder='e.g. "Update Keyboard to 30"'
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {isSupported && (
            <button
              type="button"
              onClick={toggleMic}
              disabled={isQuickSubmitting}
              className={`shrink-0 rounded-lg p-2.5 transition-all ${
                isListening
                  ? "mic-pulse bg-accent text-accent-foreground"
                  : "border border-input bg-background text-muted-foreground hover:text-foreground"
              }`}
              aria-label={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>
          )}
          <button
            type="submit"
            disabled={isQuickSubmitting}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
          >
            {isQuickSubmitting ? "..." : "Go"}
          </button>
        </form>
        {isListening && (
          <p className="mt-2 text-xs text-accent animate-pulse">🎙️ Listening...</p>
        )}
        {transcript && !isListening && (
          <p className="mt-2 rounded-md bg-muted px-3 py-2 text-xs font-mono text-muted-foreground">
            Heard: "{transcript}"
          </p>
        )}
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Product</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Category</th>
                <th className="px-5 py-3 text-center font-medium text-muted-foreground">Stock</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">New Qty</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const isLow = p.quantity <= LOW_STOCK_THRESHOLD;
                return (
                  <tr key={p.id} className={`border-b border-border last:border-0 ${isLow ? "bg-destructive/5" : "hover:bg-muted/30"}`}>
                    <td className="px-5 py-3 font-medium text-card-foreground">{p.name}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">{p.category}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${isLow ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}`}>
                        {p.quantity}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <input
                        type="number"
                        min="0"
                        placeholder="qty"
                        value={editQty[p.id] || ""}
                        onChange={(e) => setEditQty((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        className="w-20 rounded-md border border-input bg-background px-2 py-1.5 text-center text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleRowUpdate(p.id, p.name)}
                        className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                      >
                        <RefreshCw className="h-3 w-3" /> Update
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
