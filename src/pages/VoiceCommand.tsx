import { useState } from "react";
import { Mic, MicOff, CheckCircle, AlertCircle } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useInventory } from "@/context/InventoryContext";
import { motion, AnimatePresence } from "framer-motion";

export default function VoiceCommand() {
  const { updateStock } = useInventory();
  const { isListening, transcript, startListening, stopListening, resetTranscript, isSupported } = useSpeechRecognition();
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [lastCommand, setLastCommand] = useState("");

  const processCommand = (text: string) => {
    setLastCommand(text);
    const match = text.match(/(?:update|set|change)\s+(.+?)\s+(?:stock\s+)?to\s+(\d+)/i);
    if (match) {
      const msg = updateStock(match[1].trim(), parseInt(match[2]));
      setResult({ type: msg.startsWith("✅") ? "success" : "error", message: msg });
    } else {
      setResult({ type: "error", message: 'Try saying: "Update Mouse to 20"' });
    }
  };

  const toggleMic = () => {
    if (isListening) {
      stopListening();
      setTimeout(() => {
        if (transcript) {
          processCommand(transcript);
          resetTranscript();
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
