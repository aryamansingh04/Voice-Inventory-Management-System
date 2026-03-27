import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, CheckCircle, AlertCircle } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useInventory } from "@/context/InventoryContext";
import { motion, AnimatePresence } from "framer-motion";

export default function VoiceCommand() {
  const { updateStock, refreshProducts } = useInventory();
  const { isListening, transcript, startListening, stopListening, resetTranscript, isSupported } = useSpeechRecognition();
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [lastCommand, setLastCommand] = useState("");
  const latestTranscriptRef = useRef("");

  useEffect(() => {
    latestTranscriptRef.current = transcript;
  }, [transcript]);

  const processCommand = async (text: string) => {
    const cleanedText = text.trim();
    if (!cleanedText) return;

    setLastCommand(cleanedText);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5000"}/voice-command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanedText }),
      });
      const data = await response.json();

      if (!response.ok) {
        setResult({ type: "error", message: data.error || 'Try saying: "Update Mouse to 20"' });
        return;
      }

      const productName = data?.product ? String(data.product) : "";
      const parsedQuantity = Number(data?.quantity);
      if (productName && !Number.isNaN(parsedQuantity)) {
        updateStock(productName, parsedQuantity);
      }
      await refreshProducts();
      setResult({ type: "success", message: data.message || "Stock updated successfully" });
    } catch {
      setResult({ type: "error", message: "Could not reach backend voice service." });
    }
  };

  const toggleMic = () => {
    if (isListening) {
      stopListening();
      setTimeout(() => {
        const latestText = latestTranscriptRef.current.trim();
        if (latestText) {
          void processCommand(latestText);
          resetTranscript();
        } else {
          setResult({ type: "error", message: "No speech captured. Please try again." });
        }
      }, 400);
    } else {
      resetTranscript();
      setResult(null);
      setLastCommand("");
      startListening();
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Voice Command</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tap the microphone and speak to update your stock.</p>
      </div>

      {!isSupported ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Voice input is not supported in this browser. Try Chrome or Edge.
        </div>
      ) : (
        <>
          {/* Mic Button */}
          <motion.button
            onClick={toggleMic}
            whileTap={{ scale: 0.95 }}
            className={`mx-auto flex h-28 w-28 items-center justify-center rounded-full transition-all ${
              isListening
                ? "mic-pulse bg-accent text-accent-foreground shadow-lg"
                : "border-2 border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
            }`}
            aria-label={isListening ? "Stop listening" : "Start voice command"}
          >
            {isListening ? <Mic className="h-10 w-10" /> : <MicOff className="h-10 w-10" />}
          </motion.button>

          <p className={`text-sm font-medium ${isListening ? "text-accent animate-pulse" : "text-muted-foreground"}`}>
            {isListening ? "🎙️ Listening... speak now" : "Tap to start"}
          </p>

          <p className="text-xs text-muted-foreground">
            Example: "Update Keyboard to 30"
          </p>

          {/* Recognized text */}
          <AnimatePresence>
            {(transcript || lastCommand) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-border bg-card p-4 text-left"
              >
                <p className="text-xs font-medium text-muted-foreground mb-1">Recognized Command:</p>
                <p className="text-sm font-mono text-card-foreground">"{transcript || lastCommand}"</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex items-center justify-center gap-2 rounded-xl border p-4 text-sm font-medium ${
                  result.type === "success"
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}
              >
                {result.type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                {result.message}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
