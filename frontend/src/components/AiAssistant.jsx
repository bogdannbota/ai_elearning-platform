import { useState } from "react";
import { api } from "../api/client";

export default function AiAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: "user",
      text: input
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await api.post("/ai/chat", {
        message: input
      });

      const data = res.data;

      const aiMessage = {
        role: "ai",
        text: data.answer
      };

      setMessages(prev => [...prev, aiMessage]);

      // NAVIGATION ACTION
      if (data.action?.type === "navigate") {
        window.location.href = data.action.to;
      }

    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: "ai", text: "Eroare AI assistant." }
      ]);
    }

    setLoading(false);
    setInput("");
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white shadow-xl rounded-xl border flex flex-col">
      
      {/* HEADER */}
      <div className="p-2 border-b text-sm font-semibold">
        AI Assistant
      </div>

      {/* MESSAGES */}
      <div className="h-64 overflow-y-auto p-2 space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm ${
              m.role === "user" ? "text-right" : "text-left"
            }`}
          >
            <span
              className={`inline-block px-2 py-1 rounded ${
                m.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200"
              }`}
            >
              {m.text}
            </span>
          </div>
        ))}
      </div>

      {/* INPUT */}
      <div className="flex border-t p-2 gap-2">
        <input
          className="flex-1 border rounded px-2 py-1 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Scrie o întrebare..."
        />

        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-blue-500 text-white px-3 rounded text-sm"
        >
          Send
        </button>
      </div>
    </div>
  );
}