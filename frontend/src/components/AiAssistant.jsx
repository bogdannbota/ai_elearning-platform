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

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  if (!user) return null;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((p) => [...p, { role: "user", text }]);
    setInput(""); setLoading(true);
    try {
      const res = await api.post("/ai/navigate", { message: text });
      const body = res.data?.data ?? res.data;
      const answer = body?.answer ?? "Nu am un răspuns acum.";
      const route = body?.route ?? null;
      // NU mai navigăm automat: doar atașăm ruta ca link pe care îl apasă utilizatorul
      setMessages((p) => [...p, { role: "ai", text: answer, route }]);
    } catch {
      setMessages((p) => [...p, { role: "ai", text: "Asistentul nu este disponibil momentan." }]);
    } finally { setLoading(false); }
  };

  const goTo = (route) => { setOpen(false); navigate(route); };
  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="Asistent"
          className="fixed bottom-6 right-6 z-40 px-5 py-3 rounded-xl text-white text-sm font-bold shadow-lg transition hover:opacity-90"
          style={{ background: "var(--ink)", fontFamily: "var(--font-display)" }}>
          Asistent
        </button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[22rem] max-w-[calc(100vw-3rem)] surface flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 text-white" style={{ background: "var(--ink)" }}>
            <div>
              <p className="font-bold text-sm" style={{ fontFamily: "var(--font-display)" }}>Asistent</p>
              <p className="text-[11px] text-white/60">Te ajut să navighezi</p>
            </div>
            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center">✕</button>
          </div>

          <div className="h-80 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/50">
            {messages.length === 0 && (
              <p className="text-center text-slate-400 text-sm mt-8">
                Întreabă-mă unde găsești cursurile, examenele sau profilul.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                  m.role === "user" ? "bg-[var(--ink)] text-white" : "bg-white border border-slate-200 text-slate-700"
                }`}>
                  <p>{m.text}</p>
                  {m.route && (
                    <button
                      onClick={() => goTo(m.route)}
                      className="mt-2 inline-block text-[13px] font-semibold underline text-[var(--ink)] hover:opacity-80">
                      Mergi la {m.route}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && <p className="text-slate-400 text-sm">Se gândește…</p>}
            <div ref={endRef} />
          </div>

          <div className="p-3 border-t border-slate-200 bg-white flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Scrie un mesaj…"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-[var(--ink)]"
            />
            <button onClick={sendMessage} disabled={loading}
              className="px-4 py-2 rounded-lg text-white text-sm font-bold disabled:opacity-50"
              style={{ background: "var(--ink)" }}>
              Trimite
            </button>
          </div>
        </div>
      )}
    </>
  );
}