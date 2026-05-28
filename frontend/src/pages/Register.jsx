import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/axios";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const getRedirectPath = (role) => {
    if (role === "admin") return "/admin/dashboard";
    if (role === "manager") return "/manager/dashboard";
    return "/student/dashboard";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login", { email, password });
      const payload = res.data?.data ?? res.data;

      if (!payload?.access_token || !payload?.user) {
        throw new Error("Răspuns invalid de la server");
      }

      login(payload.access_token, payload.user);
      navigate(getRedirectPath(payload.user.role), { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        "Email sau parolă incorectă"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50 p-4 sm:p-8 font-sans overflow-hidden selection:bg-cyan-200 selection:text-cyan-900">
      
      {/* Element decorativ de fundal (Glow / Spatial UI) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-cyan-400/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Cardul de Login */}
      <div className="relative z-10 w-full max-w-md bg-white border border-slate-100 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] rounded-[2rem] p-8 sm:p-10 transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)]">
        
        <div className="mb-8 text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Bun venit
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            Conectează-te la contul tău
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Input Email */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 ml-1 block">
              Adresă de email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nume@exemplu.ro"
              className="w-full bg-white border border-slate-200 text-slate-900 placeholder-slate-400 p-3.5 rounded-2xl outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 transition-all duration-300"
              required
            />
          </div>

          {/* Input Parolă + Link Forgot Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between ml-1">
              <label className="text-sm font-semibold text-slate-700 block">
                Parolă
              </label>
              <Link 
                to="/forgot-password" 
                className="text-xs font-semibold text-cyan-600 hover:text-cyan-500 transition-colors"
                tabIndex="-1"
              >
                [Ai uitat parola?]
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white border border-slate-200 text-slate-900 placeholder-slate-400 p-3.5 rounded-2xl outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 transition-all duration-300"
              required
            />
          </div>

          {/* Mesaj de eroare */}
          {error && (
            <div className="p-4 bg-red-50/80 border border-red-100 text-red-600 text-sm rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0 mt-0.5 text-red-500">
                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" clipRule="evenodd" />
              </svg>
              <span className="font-medium leading-tight">{error}</span>
            </div>
          )}

          {/* Buton principal */}
          <button
            disabled={loading}
            className="w-full relative group overflow-hidden bg-[#0f172a] text-white font-semibold p-4 rounded-2xl shadow-lg shadow-slate-900/20 hover:shadow-slate-900/30 active:scale-[0.98] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white/80" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Se autentifică...</span>
                </>
              ) : (
                "Intră în cont"
              )}
            </span>
          </button>
        </form>

        {/* Secțiunea de redirecționare pentru cont nou */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-600">
            Nu ai încă un cont?{" "}
            <Link 
              to="/register" 
              className="font-bold text-cyan-600 hover:text-cyan-500 transition-colors focus:outline-none focus:underline"
            >
              [Înregistrează-te]
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}