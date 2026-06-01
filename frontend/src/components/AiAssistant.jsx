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
      const res = await api.post("/ai/chat", { message: text });
      const body = res.data?.data ?? res.data;
      const answer = body?.answer ?? body?.response ?? "Nu am un răspuns acum.";
      const action = body?.action;
      setMessages((p) => [...p, { role: "ai", text: answer }]);
      if (action?.type === "navigate" && action.to) { setOpen(false); navigate(action.to); }
    } catch {
      setMessages((p) => [...p, { role: "ai", text: "Asistentul nu este disponibil momentan." }]);
    } finally { setLoading(false); }
  };
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
            {messages.length === 0 && <p className="text-center text-slate-400 text-sm mt-8">Întreabă-mă unde găsești cursurile, examenele sau profilul.</p>}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <span className={`inline-block px-3.5 py-2 rounded-2xl text-sm max-w-[85%] leading-relaxed ${m.role === "user" ? "text-white rounded-br-md" : "bg-white border text-slate-700 rounded-bl-md"}`}
                  style={m.role === "user" ? { background: "var(--ink)" } : { borderColor: "var(--line)" }}>{m.text}</span>
              </div>
            ))}
            {loading && <div className="flex justify-start"><span className="inline-flex gap-1 px-4 py-3 rounded-2xl bg-white border" style={{ borderColor: "var(--line)" }}>{[0, 150, 300].map((d) => <span key={d} className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</span></div>}
            <div ref={endRef} />
          </div>
          <div className="flex items-center gap-2 p-3 border-t bg-white" style={{ borderColor: "var(--line)" }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} placeholder="Scrie o întrebare..." className="input flex-1" />
            <button onClick={sendMessage} disabled={loading || !input.trim()} className="btn btn-primary px-4">→</button>
          </div>
        </div>
      )}
    </>
  );
}