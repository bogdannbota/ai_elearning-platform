import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/axios";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const getRedirectPath = (role) =>
    role === "admin" ? "/admin/dashboard" : role === "manager" ? "/manager/dashboard" : "/student/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      const payload = res.data?.data ?? res.data;
      if (!payload?.access_token || !payload?.user) throw new Error("Răspuns invalid de la server");
      login(payload.access_token, payload.user);
      navigate(getRedirectPath(payload.user.role), { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || err?.response?.data?.error || err?.message || "Email sau parolă incorectă");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 text-white" style={{ background: "var(--ink)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center font-bold" style={{ fontFamily: "var(--font-display)" }}>L</div>
          <span className="font-bold text-lg" style={{ fontFamily: "var(--font-display)" }}>IntelliSense Edu</span>
        </div>
        <div>
          <h2 className="text-3xl font-extrabold leading-tight mb-4">Platforma de instruire a echipei tale.</h2>
          <p className="text-white/60 text-sm max-w-sm">Cursuri, examene și trasee de învățare, organizate pe departamente.</p>
        </div>
        <p className="text-white/40 text-xs">© {new Date().getFullYear()} IntelliSense Edu</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-slate-900">Autentificare</h1>
            <p className="text-slate-500 text-sm mt-1">Conectează-te la contul tău.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nume@companie.ro" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Parolă</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">{error}</div>}
            <button disabled={loading} className="btn btn-primary w-full py-3">
              {loading ? "Se autentifică..." : "Intră în cont"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}