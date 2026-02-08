import { useState, useCallback, useRef } from "react";
import { Message, ChatSettings, DEFAULT_SETTINGS, AppCommodityContext } from "@/types/chat";
import { toast } from "sonner";

// Chat uses hedge-assistant-chat; if not on same project as DB, set VITE_SUPABASE_CHAT_URL to the project where it's deployed
const SUPABASE_CHAT_BASE = import.meta.env.VITE_SUPABASE_CHAT_URL || import.meta.env.VITE_SUPABASE_URL || "https://sudujoijxndsohgfxoad.supabase.co";
const CHAT_URL = `${SUPABASE_CHAT_BASE}/functions/v1/hedge-assistant-chat`;

export interface UseForexChatOptions {
  appCommodityContext?: AppCommodityContext | null;
}

export function useForexChat(options?: UseForexChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);
  const appContextRef = useRef<AppCommodityContext | null | undefined>(options?.appCommodityContext);
  appContextRef.current = options?.appCommodityContext;

  const sendMessage = useCallback(async (input: string) => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    let assistantContent = "";

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_CHAT_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          settings: { ...settings, geminiApiKey: settings.geminiApiKey || undefined },
          appCommodityContext: appContextRef.current ?? undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Pas de réponse du serveur");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processLine = (line: string) => {
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") return false;
        if (!line.startsWith("data: ")) return false;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") return true;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) updateAssistant(content);
        } catch {
          return "retry";
        }
        return false;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (value) buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          const result = processLine(line);
          if (result === true) break; // [DONE]
          if (result === "retry") {
            buffer = line + "\n" + buffer;
            break;
          }
        }

        if (done) {
          // Process any remaining buffer (last chunk may lack trailing newline)
          while (buffer.trim()) {
            const lineEnd = buffer.indexOf("\n");
            const line = lineEnd === -1 ? buffer : buffer.slice(0, lineEnd);
            buffer = lineEnd === -1 ? "" : buffer.slice(lineEnd + 1);
            const result = processLine(line);
            if (result === true) break;
            if (result === "retry" || (lineEnd === -1 && line.trim())) break;
          }
          break;
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue");
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, settings]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isLoading, sendMessage, clearMessages, settings, setSettings };
}
