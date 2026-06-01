import { useEffect } from "react";

export default function Toast({ id, message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [id, onClose]);

  const cfg = {
    success: { cls: "bg-emerald-50 border-emerald-200 text-emerald-800", icon: "✓" },
    error:   { cls: "bg-rose-50 border-rose-200 text-rose-800", icon: "!" },
    warning: { cls: "bg-amber-50 border-amber-200 text-amber-800", icon: "!" },
    info:    { cls: "bg-slate-50 border-slate-200 text-slate-800", icon: "i" },
  }[type] || { cls: "bg-slate-50 border-slate-200 text-slate-800", icon: "i" };

  return (
    <div className={`${cfg.cls} px-4 py-3 rounded-xl border shadow-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-auto min-w-[260px]`}>
      <div className="flex items-center gap-3">
        <span className="w-5 h-5 rounded-full bg-white/70 flex items-center justify-center text-xs font-bold metric">{cfg.icon}</span>
        <span className="font-medium text-sm">{message}</span>
      </div>
      <button onClick={onClose} className="opacity-50 hover:opacity-100 transition">✕</button>
    </div>
  );
}