import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/auth/login",
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      );
      login(res.data.access_token, res.data.user);
      if (res.data.user.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError("Email sau parolă incorectă");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Subtle Gradient & Pattern */}
      <div className="absolute inset-0 bg-white" style={{ backgroundImage: "linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%)" }} />
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZyBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2YmI4YTMiIGZpbGwtb3BhY2l0eT0iMC41Ij48cGF0aCBkPSJNMCAwaDQwdjQwSDBWMHptMjAgMjBoMjB2MjBIMjBWMjB6TTAgMjBoMjB2MjBIMFYyMHoyMCAwaDIwdjIwSDIwVjB6Ii8+PC9nPjwvZz48L3N2Zz4=')" }} />

      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500 z-10">
        
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-cyan-400 to-amber-400 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/10">
            <span className="text-3xl">🎓</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">AI eLearning</h1>
          <p className="text-gray-600 mt-2 text-sm">Bine ai revenit! Loghează-te pentru a continua învățarea.</p>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-2xl shadow-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Email</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">✉️</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white focus:ring-1 focus:ring-cyan-100 transition-all"
                  placeholder="nume@exemplu.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 ml-1 pr-1">
                <label className="block text-sm font-medium text-gray-700">Parolă</label>
                <a href="#" className="text-xs text-amber-600 hover:text-amber-700 transition">Ai uitat parola?</a>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white focus:ring-1 focus:ring-cyan-100 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-4 rounded-xl transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50 disabled:shadow-none mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Se încarcă...
                </span>
              ) : (
                "Intră în cont"
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-gray-500 text-sm">
              Nu ai cont încă?{" "}
              <button 
                onClick={() => navigate("/register")} 
                className="text-amber-600 hover:text-amber-700 font-semibold transition"
              >
                Creează unul acum
              </button>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}