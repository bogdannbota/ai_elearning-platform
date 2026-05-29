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

  // Scroll la ultimul mesaj
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // NU afișa asistentul dacă utilizatorul nu e logat (login/register)
  if (!user) return null;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/ai/chat", { message: text });

      // Acceptă atât {answer, action} cât și {data:{...}} / {response}
      const body = res.data?.data ?? res.data;
      const answer = body?.answer ?? body?.response ?? "Nu am un răspuns acum.";
      const action = body?.action;

      setMessages((prev) => [...prev, { role: "ai", text: answer }]);

      if (action?.type === "navigate" && action.to) {
        setOpen(false);
        navigate(action.to);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
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
      {/* Buton flotant */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Deschide asistentul AI"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white text-2xl shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
        >
          ✨
        </button>
      )}

      {/* Panou chat */}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[22rem] max-w-[calc(100vw-3rem)] bg-white border border-gray-100 rounded-3xl shadow-2xl shadow-gray-300/40 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-br from-cyan-500 to-teal-500 text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-lg">
                ✨
              </div>
              <div className="leading-tight">
                <p className="font-extrabold text-sm">Asistent AI</p>
                <p className="text-[11px] text-white/80 font-medium">Te ajut să navighezi</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Închide"
              className="w-8 h-8 rounded-lg hover:bg-white/20 transition flex items-center justify-center text-lg"
            >
              ✕
            </button>
          </div>

          {/* Mesaje */}
          <div className="h-80 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/50">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm mt-8 px-4">
                <p className="font-semibold text-gray-500 mb-1">Salut! 👋</p>
                <p>Întreabă-mă unde găsești cursurile, examenele sau profilul tău.</p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <span
                  className={`inline-block px-3.5 py-2 rounded-2xl text-sm max-w-[85%] leading-relaxed ${
                    m.role === "user"
                      ? "bg-cyan-500 text-white rounded-br-md"
                      : "bg-white border border-gray-100 text-gray-700 rounded-bl-md shadow-sm"
                  }`}
                >
                  {m.text}
                </span>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <span className="inline-flex gap-1 px-4 py-3 rounded-2xl rounded-bl-md bg-white border border-gray-100 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 p-3 border-t border-gray-100 bg-white">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Scrie o întrebare..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-50 transition"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-xl bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-300 text-white font-bold transition flex items-center justify-center flex-shrink-0"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}