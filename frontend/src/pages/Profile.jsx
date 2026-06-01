import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { useToast } from "../context/ToastContext";
import axios from "axios";
import Modal from "../components/Modal";
import { deptTheme } from "../theme/departments";

export default function Profile() {
  const { user, token } = useAuth();
  const { addToast } = useToast();
  const [formData, setFormData] = useState({ full_name: "", email: "", department: "" });
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

  useEffect(() => {
    if (user) setFormData({ full_name: user.full_name || "", email: user.email || "", department: user.department?.name || "" });
  }, [user]);

  const handleChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handlePasswordChange = (e) => setPasswords((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put(`http://127.0.0.1:8000/users/profile?token=${token}`, { full_name: formData.full_name, department: formData.department });
      addToast("Profil actualizat cu succes", "success");
      setEditing(false);
    } catch { addToast("Eroare la actualizarea profilului", "error"); }
    finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) return addToast("Parolele nu se potrivesc", "error");
    if (passwords.new.length < 6) return addToast("Parola trebuie să aibă cel puțin 6 caractere", "error");
    setLoading(true);
    try {
      await axios.put(`http://127.0.0.1:8000/users/change-password?token=${token}`, { current_password: passwords.current, new_password: passwords.new });
      addToast("Parola schimbată cu succes", "success");
      setPasswordModal(false); setPasswords({ current: "", new: "", confirm: "" });
    } catch { addToast("Eroare la schimbarea parolei", "error"); }
    finally { setLoading(false); }
  };

  const initials = user?.full_name ? user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "U";
  const dept = deptTheme(user?.department_id);
  const roleLabel = { admin: "Administrator", manager: "Manager departament", student: "Cursant" }[user?.role] || user?.role;

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="surface overflow-hidden">
          {/* Header */}
          <div className="px-8 py-8 border-b flex flex-col md:flex-row items-center gap-6" style={{ borderColor: "var(--line)" }}>
            <div className="w-20 h-20 rounded-xl flex items-center justify-center text-3xl font-bold text-white" style={{ background: "var(--ink)" }}>{initials}</div>
            <div className="text-center md:text-left">
              <h1 className="text-2xl font-extrabold text-slate-900">{user?.full_name || "Utilizator"}</h1>
              <div className="flex items-center gap-2 mt-2 justify-center md:justify-start">
                <span className="tag bg-slate-100 text-slate-600 border-slate-200">{roleLabel}</span>
                {user?.department?.name && <span className={`tag ${dept.chip}`}>{user.department.name}</span>}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">Informații personale</h2>
              {!editing && <button onClick={() => setEditing(true)} className="btn btn-ghost">Editează</button>}
            </div>

            {!editing ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {[
                    { label: "Nume complet", value: formData.full_name },
                    { label: "Email", value: formData.email },
                    { label: "Departament", value: formData.department || "Nespecificat" },
                  ].map((f) => (
                    <div key={f.label}>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{f.label}</p>
                      <p className="text-base font-semibold text-slate-900">{f.value}</p>
                    </div>
                  ))}
                </div>
                <div className="pt-6 border-t" style={{ borderColor: "var(--line)" }}>
                  <button onClick={() => setPasswordModal(true)} className="btn btn-primary">Schimbă parola</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nume complet</label>
                    <input name="full_name" className="input" value={formData.full_name} onChange={handleChange} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email (needitabil)</label>
                    <input value={formData.email} disabled className="input" style={{ background: "#f0f2f5", color: "#94a3b8" }} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Departament</label>
                    <input name="department" className="input" value={formData.department} onChange={handleChange} />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Se salvează..." : "Salvează"}</button>
                  <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost">Anulează</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={passwordModal} title="Schimbă parola"
        onClose={() => { setPasswordModal(false); setPasswords({ current: "", new: "", confirm: "" }); }}
        onConfirm={handleChangePassword} confirmText="Actualizează parola">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Introdu parola curentă pentru a putea alege una nouă.</p>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Parola actuală</label>
            <input type="password" name="current" className="input" value={passwords.current} onChange={handlePasswordChange} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Parola nouă</label>
              <input type="password" name="new" className="input" value={passwords.new} onChange={handlePasswordChange} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirmă</label>
              <input type="password" name="confirm" className="input" value={passwords.confirm} onChange={handlePasswordChange} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}