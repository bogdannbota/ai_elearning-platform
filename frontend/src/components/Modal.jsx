export default function Modal({ isOpen, title, children, onClose, onConfirm, confirmText = "Confirmă", cancelText = "Anulează", isDanger = false }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,22,34,.45)" }}>
      <div className="surface w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-xl font-bold text-slate-900 mb-3">{title}</h2>
        <div className="text-slate-600 text-sm mb-6">{children}</div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn btn-ghost">{cancelText}</button>
          {onConfirm && (
            <button onClick={onConfirm} className="btn btn-primary" style={isDanger ? { background: "#be123c" } : undefined}>
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}