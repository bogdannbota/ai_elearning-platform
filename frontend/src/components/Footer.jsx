import { useAuth } from "../context/AuthContext";

export default function Footer() {
  const { user } = useAuth();
  if (!user) return null;

  const year = new Date().getFullYear();

  return (
    <footer className="bg-white border-t mt-auto" style={{ borderColor: "var(--line)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm"
               style={{ background: "var(--ink)", fontFamily: "var(--font-display)" }}>
            L
          </div>
          <span className="text-sm text-slate-500">
            Platformă e-learning <span className="text-slate-300">·</span> Lucrare de dizertație
          </span>
        </div>

        <p className="text-xs text-slate-400 text-center sm:text-right">
          © {year} Bota Bogdan. Toate drepturile rezervate.
        </p>
      </div>
    </footer>
  );
}