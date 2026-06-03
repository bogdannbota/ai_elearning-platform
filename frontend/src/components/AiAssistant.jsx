import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

const SUGGESTIONS = [
  "Unde îmi văd cursurile?",
  "Du-mă la examene",
  "Deschide profilul meu",
  "Mergi la dashboard",
];

export default function AiAssistant() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    const onEsc = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onEsc);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!user) return null;

  const sendMessage = async (preset) => {
    const text = (preset ?? input).trim();
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
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 pl-4 pr-5 py-3 rounded-full text-white text-sm font-bold shadow-lg shadow-slate-900/20 transition hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          style={{ background: "var(--ink)", fontFamily: "var(--font-display)" }}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          Asistent
        </button>
      )}

      {open && (
        <>
          {/* Click în afara panoului => închide (transparent pe desktop, întunecat pe mobil) */}
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 sm:bg-transparent"
            aria-hidden="true"
          />

          {/* Panou */}
          <div
            role="dialog"
            aria-label="Asistent"
            className="fixed z-50 flex flex-col overflow-hidden bg-white shadow-2xl shadow-slate-900/25 ring-1 ring-black/5
                       inset-x-0 bottom-0 h-[85dvh] rounded-t-2xl
                       sm:inset-auto sm:bottom-6 sm:right-6
                       sm:h-[min(34rem,calc(100dvh-3rem))] sm:w-[23rem] sm:max-w-[calc(100vw-3rem)] sm:rounded-2xl"
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3.5 text-white shrink-0"
              style={{ background: "var(--ink)" }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[15px] shrink-0 bg-white/10 ring-1 ring-white/15"
                style={{ fontFamily: "var(--font-display)" }}
              >
                L
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="font-bold text-sm leading-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Asistent
                </p>
                <p className="flex items-center gap-1.5 text-[11px] text-white/55">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Disponibil
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Închide"
                className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center transition shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {/* Mesaje */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
              {messages.length === 0 && (
                <div className="mt-2">
                  <p className="text-slate-500 text-sm leading-relaxed mb-3">
                    Bună{user.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}. Te pot
                    ghida prin platformă — întreabă-mă unde găsești ceva sau cere-mi să te
                    duc direct acolo.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium text-slate-600 bg-white border transition hover:border-slate-300 hover:text-slate-900"
                        style={{ borderColor: "var(--line)" }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <span
                    className={`inline-block px-3.5 py-2.5 text-sm max-w-[85%] leading-relaxed break-words shadow-sm ${
                      m.role === "user"
                        ? "text-white rounded-2xl rounded-br-md"
                        : "bg-white border text-slate-700 rounded-2xl rounded-bl-md"
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
                    className="inline-flex gap-1 px-4 py-3 rounded-2xl rounded-bl-md bg-white border shadow-sm"
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

            {/* Input */}
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
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                aria-label="Trimite"
                className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "var(--ink)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}