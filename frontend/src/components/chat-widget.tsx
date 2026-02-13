import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/api";

interface ChatMessage {
  role: "user" | "bot";
  content: string;
}

interface ChatWidgetProps {
  jobId: number;
}

export function ChatWidget({ jobId }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await apiRequest("POST", `/api/jobs/${jobId}/chat`, {
        message: text,
        history,
      });

      const data = await res.json();
      const botMsg: ChatMessage = {
        role: "bot",
        content: data.reply || "No response",
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, sending, messages, jobId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-24 right-6 z-50 w-[380px] max-h-[520px] flex flex-col bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
              <div className="flex items-center gap-2">
                <Bot className="size-5 text-primary" />
                <span className="font-semibold text-sm">HR Assistant</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full"
                onClick={() => setOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 min-h-0">
              <div ref={scrollRef} className="p-4 space-y-3 max-h-[360px] overflow-y-auto">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <Bot className="size-10 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground mt-3">
                      Ask me anything about this job's candidates, applications, or hiring process.
                    </p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "bot" && (
                      <div className="flex-shrink-0 size-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                        <Bot className="size-3.5 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted rounded-bl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === "user" && (
                      <div className="flex-shrink-0 size-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                        <User className="size-3.5 text-primary" />
                      </div>
                    )}
                  </div>
                ))}
                {sending && (
                  <div className="flex gap-2 justify-start">
                    <div className="flex-shrink-0 size-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                      <Bot className="size-3.5 text-primary" />
                    </div>
                    <div className="bg-muted px-3 py-2 rounded-xl rounded-bl-sm">
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t border-border p-3 flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                disabled={sending}
                className="flex-1 rounded-xl text-sm"
              />
              <Button
                size="icon"
                className="rounded-xl shrink-0"
                onClick={sendMessage}
                disabled={sending || !input.trim()}
              >
                <Send className="size-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 size-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center justify-center hover:shadow-xl transition-shadow"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="size-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageCircle className="size-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
