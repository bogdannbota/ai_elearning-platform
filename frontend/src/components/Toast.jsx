import { useEffect } from "react";

export default function Toast({ id, message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [id, onClose]);

  const typeConfig = {
    success: {
      bg: "bg-green-50",
      border: "border-green-200",
      icon: "✓",
      text: "text-green-800",
      button: "hover:bg-green-100",
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      icon: "✕",
      text: "text-red-800",
      button: "hover:bg-red-100",
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      icon: "⚠",
      text: "text-yellow-800",
      button: "hover:bg-yellow-100",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: "ℹ",
      text: "text-blue-800",
      button: "hover:bg-blue-100",
    },
  };

  const config = typeConfig[type] || typeConfig.info;

  return (
    <div
      className={`${config.bg} ${config.border} ${config.text} px-4 py-3 rounded-lg border shadow-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-auto`}
    >
      <div className="flex items-center gap-3">
        <span className="font-bold text-lg">{config.icon}</span>
        <span className="font-medium">{message}</span>
      </div>
      <button
        onClick={onClose}
        className={`${config.button} w-6 h-6 flex items-center justify-center rounded transition-colors`}
      >
        ✕
      </button>
    </div>
  );
}
