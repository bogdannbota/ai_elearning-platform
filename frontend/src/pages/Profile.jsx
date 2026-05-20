import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { useToast } from "../context/ToastContext";
import axios from "axios";
import Modal from "../components/Modal";

export default function Profile() {
  const { user, token } = useAuth();
  const { addToast } = useToast();
  const [formData, setFormData] = useState({ full_name: "", email: "", department: "" });
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        email: user.email || "",
        department: user.department || "",
      });
    }
  }, [user]);

  const handleChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handlePasswordChange = (e) => setPasswords((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put(
        `http://127.0.0.1:8000/users/profile?token=${token}`,
        { full_name: formData.full_name, department: formData.department }
      );
      addToast("Profil actualizat cu succes!", "success");
      setEditing(false);
    } catch (err) {
      addToast("Eroare la actualizarea profilului", "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) return addToast("Parolele nu se potrivesc!", "error");
    if (passwords.new.length < 6) return addToast("Parola trebuie să aibă cel puțin 6 caractere", "error");

    setLoading(true);
    try {
      await axios.put(
        `http://127.0.0.1:8000/users/change-password?token=${token}`,
        { current_password: passwords.current, new_password: passwords.new }
      );
      addToast("Parola schimbată cu succes!", "success");
      setPasswordModal(false);
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (err) {
      addToast("Eroare la schimbarea parolei", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white border border-gray-100 rounded-3xl shadow-2xl shadow-gray-100/50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Fresh Banner Profile Header */}
          <div className="relative pt-12 pb-8 px-8 border-b border-gray-100">
            {/* Soft decorative mesh gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-amber-50 opacity-80" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
              {/* Avatar Ring */}
              <div className="p-1.5 bg-white rounded-full shadow-lg shadow-cyan-100">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-teal-400 flex items-center justify-center text-4xl font-black text-white">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
                </div>
              </div>
              
              <div className="text-center md:text-left">
                <h1 className="text-3xl font-extrabold text-gray-900">{user?.full_name || "Utilizator"}</h1>
                <span className="inline-block mt-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold uppercase tracking-wide">
                  Rol: {user?.role}
                </span>
              </div>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Informații Personale</h2>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-sm font-bold text-cyan-600 hover:text-cyan-700 bg-cyan-50 px-4 py-2 rounded-xl transition"
                >
                  ✏️ Editează
                </button>
              )}
            </div>

            {!editing ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Nume Complet</p>
                    <p className="text-lg font-semibold text-gray-900">{formData.full_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Adresă de Email</p>
                    <p className="text-lg font-semibold text-gray-900">{formData.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Departament / Specializare</p>
                    <p className="text-lg font-semibold text-gray-900">{formData.department || "Nespecificat"}</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <button
                    onClick={() => setPasswordModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition font-bold shadow-md shadow-gray-900/10"
                  >
                    <span>🔒</span> Schimbă Parola
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-5 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Nume Complet</label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Email (Ineditaibil)</label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Departament</label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition font-bold disabled:opacity-50 shadow-md shadow-cyan-500/20"
                  >
                    {loading ? "Se salvează..." : "💾 Salvează Modificările"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-bold"
                  >
                    Anulează
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Modal - Adapted to Light Theme */}
      <Modal
        isOpen={passwordModal}
        title="Securitate Cont"
        onClose={() => { setPasswordModal(false); setPasswords({ current: "", new: "", confirm: "" }); }}
        onConfirm={handleChangePassword}
        confirmText="Actualizează Parola"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 mb-4">Te rugăm să introduci parola ta curentă pentru a putea alege una nouă.</p>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Parola Actuală</label>
            <input
              type="password"
              name="current"
              value={passwords.current}
              onChange={handlePasswordChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Parola Nouă</label>
              <input
                type="password"
                name="new"
                value={passwords.new}
                onChange={handlePasswordChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Confirmă</label>
              <input
                type="password"
                name="confirm"
                value={passwords.confirm}
                onChange={handlePasswordChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 transition-all"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}