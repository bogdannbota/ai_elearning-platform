import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function AiAssistant() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll la ultimul mesaj
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus pe input când se deschide + închidere cu Escape
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      const onEsc = (e) => e.key === "Escape" && setOpen(false);
      window.addEventListener("keydown", onEsc);
      return () => {
        clearTimeout(t);
        window.removeEventListener("keydown", onEsc);
      };
    }
  }, [open]);

  if (!user) return null;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((p) => [...p, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.post("/ai/chat", { message: text });
      const body = res.data?.data ?? res.data;
      const answer = body?.answer ?? body?.response ?? "Nu am un răspuns acum.";
      const action = body?.action;
      setMessages((p) => [...p, { role: "ai", text: answer }]);
      if (action?.type === "navigate" && action.to) {
        setOpen(false);
        navigate(action.to);
      }
    } catch {
      setMessages((p) => [
        ...p,
        { role: "ai", text: "Asistentul nu este disponibil momentan." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Buton de lansare */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Deschide asistentul"
          className="fixed bottom-5 right-5 z-40 px-5 py-3 rounded-xl text-white text-sm font-bold shadow-lg transition hover:opacity-90 active:scale-95"
          style={{ background: "var(--ink)", fontFamily: "var(--font-display)" }}
        >
          Asistent
        </button>
      )}

      {open && (
        <>
          {/* Fundal întunecat – doar pe mobil, închide la tap */}
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 sm:hidden"
            aria-hidden="true"
          />

          {/* Panou:
              - mobil: bottom-sheet pe toată lățimea, înălțime din viewport
              - desktop (sm+): card flotant jos-dreapta */}
          <div
            role="dialog"
            aria-label="Asistent"
            className="fixed z-50 flex flex-col overflow-hidden bg-white shadow-2xl
                       inset-x-0 bottom-0 h-[85dvh] rounded-t-2xl
                       sm:inset-auto sm:bottom-6 sm:right-6
                       sm:h-[min(32rem,calc(100dvh-3rem))] sm:w-[22rem] sm:max-w-[calc(100vw-3rem)] sm:rounded-2xl"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 text-white shrink-0"
              style={{ background: "var(--ink)" }}
            >
              <div>
                <p
                  className="font-bold text-sm"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Asistent
                </p>
                <p className="text-[11px] text-white/60">Te ajut să navighezi</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Închide"
                className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Zona de mesaje – ocupă tot spațiul rămas și are scroll propriu */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/50">
              {messages.length === 0 && (
                <p className="text-center text-slate-400 text-sm mt-8 px-4">
                  Întreabă-mă unde găsești cursurile, examenele sau profilul.
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <span
                    className={`inline-block px-3.5 py-2 rounded-2xl text-sm max-w-[85%] leading-relaxed break-words ${
                      m.role === "user"
                        ? "text-white rounded-br-md"
                        : "bg-white border text-slate-700 rounded-bl-md"
                    }`}
                    style={
                      m.role === "user"
                        ? { background: "var(--ink)" }
                        : { borderColor: "var(--line)" }
                    }
                  >
                    {m.text}
                  </span>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <span
                    className="inline-flex gap-1 px-4 py-3 rounded-2xl bg-white border"
                    style={{ borderColor: "var(--line)" }}
                  >
                    {[0, 150, 300].map((d) => (
                      <span
                        key={d}
                        className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"
                        style={{ animationDelay: `${d}ms` }}
                      />
                    ))}
                  </span>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input – rămâne lipit jos, cu spațiu pentru bara de pe telefon */}
            <div
              className="flex items-center gap-2 p-3 border-t bg-white shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
              style={{ borderColor: "var(--line)" }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Scrie o întrebare..."
                className="input flex-1"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                aria-label="Trimite"
                className="btn btn-primary px-4 shrink-0"
              >
                →
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}