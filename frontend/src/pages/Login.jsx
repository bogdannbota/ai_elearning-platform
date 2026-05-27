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

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");

  try {
    const res = await api.post("/auth/login", {
      email,
      password,
    });

    const data = res.data.data; // IMPORTANT (APIResponse wrapper)

    login(data.access_token, data.user);

    if (data.user.role === "admin") {
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow">
        
        <h1 className="text-2xl font-bold mb-6">Login</h1>

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-3 rounded"
            required
          />

          <input
            type="password"
            placeholder="Parolă"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-3 rounded"
            required
          />

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            disabled={loading}
            className="w-full bg-cyan-500 text-white p-3 rounded"
          >
            {loading ? "Se încarcă..." : "Intră în cont"}
          </button>

        </form>
      </div>
    </div>
  );
}