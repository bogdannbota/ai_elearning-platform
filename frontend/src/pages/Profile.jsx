import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { useToast } from "../context/ToastContext";
import axios from "axios";
import Modal from "../components/Modal";

export default function Profile() {
  const { user, token } = useAuth();
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    department: "",
  });
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        email: user.email || "",
        department: user.department || "",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put(
        `http://127.0.0.1:8000/users/profile?token=${token}`,
        {
          full_name: formData.full_name,
          department: formData.department,
        }
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
    if (passwords.new !== passwords.confirm) {
      addToast("Parolele nu se potrivesc!", "error");
      return;
    }

    if (passwords.new.length < 6) {
      addToast("Parola trebuie să aibă cel puțin 6 caractere", "error");
      return;
    }

    setLoading(true);
    try {
      await axios.put(
        `http://127.0.0.1:8000/users/change-password?token=${token}`,
        {
          current_password: passwords.current,
          new_password: passwords.new,
        }
      );
      addToast("Parola schimbată cu succes!", "success");
      setPasswordModal(false);
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (err) {
      addToast("Eroare la schimbarea parolei", "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-8">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-3xl font-bold">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{user?.full_name || "Utilizator"}</h1>
                <p className="text-blue-100 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {!editing ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 uppercase tracking-wide">Nume Complet</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{formData.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase tracking-wide">Email</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{formData.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase tracking-wide">Departament</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{formData.department || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase tracking-wide">Rol</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">{user?.role}</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => setEditing(true)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    ✏️ Editează Profil
                  </button>
                  <button
                    onClick={() => setPasswordModal(true)}
                    className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium"
                  >
                    🔒 Schimbă Parola
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nume Complet</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Departament</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
                  >
                    {loading ? "Se salvează..." : "💾 Salvează"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium"
                  >
                    Anulează
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={passwordModal}
        title="Schimbă Parola"
        onClose={() => {
          setPasswordModal(false);
          setPasswords({ current: "", new: "", confirm: "" });
        }}
        onConfirm={handleChangePassword}
        confirmText="Schimbă Parola"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parola Actuală</label>
            <input
              type="password"
              name="current"
              value={passwords.current}
              onChange={handlePasswordChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Introduceți parola actuală"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parola Nouă</label>
            <input
              type="password"
              name="new"
              value={passwords.new}
              onChange={handlePasswordChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Introduceți parola nouă"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmă Parola</label>
            <input
              type="password"
              name="confirm"
              value={passwords.confirm}
              onChange={handlePasswordChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Confirmați parola nouă"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
