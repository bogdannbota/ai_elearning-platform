import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm_password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm_password) {
      setError("Parolele nu coincid!");
      return;
    }
    if (form.password.length < 6) {
      setError("Parola trebuie să aibă minim 6 caractere!");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        "http://127.0.0.1:8000/auth/register",
        {
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          role: "student",
        },
        { headers: { "Content-Type": "application/json" } }
      );
      setSuccess("Cont creat cu succes! Te vom redirecționa imediat...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || "Eroare la înregistrare");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Subtle Gradient & Pattern */}
      <div className="absolute inset-0 bg-white" style={{ backgroundImage: "linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(6, 182, 212, 0.05) 100%)" }} />
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZyBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2YmI4YTMiIGZpbGwtb3BhY2l0eT0iMC41Ij48cGF0aCBkPSJNMCAwaDQwdjQwSDBWMHptMjAgMjBoMjB2MjBIMjBWMjB6TTAgMjBoMjB2MjBIMFYyMHoyMCAwaDIwdjIwSDIwVjB6Ii8+PC9nPjwvZz48L3N2Zz4=')" }} />

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 z-10">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-300 to-cyan-400 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-amber-500/10">
            <span className="text-3xl">🚀</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Începe călătoria</h1>
          <p className="text-gray-600 mt-2 text-sm">Creează un cont gratuit și accesează cursurile interactive.</p>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-2xl shadow-gray-100">
          
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2 mb-6">
              <span>⚠️</span> {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2 mb-6">
              <span>✓</span> {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div>
              <label className="block text-xs font-semibold text-cyan-700 mb-1.5 ml-1 uppercase tracking-wider">Nume Complet</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">👤</span>
                <input
                  type="text"
                  placeholder="Ex: Ion Popescu"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white focus:ring-1 focus:ring-cyan-100 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-cyan-700 mb-1.5 ml-1 uppercase tracking-wider">Email</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">✉️</span>
                <input
                  type="email"
                  placeholder="nume@exemplu.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white focus:ring-1 focus:ring-cyan-100 transition-all"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-cyan-700 mb-1.5 ml-1 uppercase tracking-wider">Parolă</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white focus:ring-1 focus:ring-cyan-100 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-cyan-700 mb-1.5 ml-1 uppercase tracking-wider">Confirmare</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.confirm_password}
                  onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white focus:ring-1 focus:ring-cyan-100 transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-extrabold py-4 rounded-xl transition-all shadow-md shadow-gray-900/10 disabled:opacity-50 disabled:shadow-none mt-6"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Se procesează...
                </span>
              ) : (
                "Creează contul"
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-gray-500 text-sm">
              Ai deja un cont?{" "}
              <button 
                onClick={() => navigate("/login")} 
                className="text-cyan-600 hover:text-cyan-700 font-semibold transition"
              >
                Loghează-te aici
              </button>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}