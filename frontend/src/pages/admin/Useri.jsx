import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8000";

export default function Useri() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [editDept, setEditDept] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: "", email: "", password: "", role: "student", department_id: "" });

  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => {
    setLoading(true);
    try {
      const [u, d] = await Promise.all([
        axios.get(`${API}/users/?token=${token}`),
        axios.get(`${API}/departments/?token=${token}`),
      ]);
      setUsers(u.data); setDepartments(d.data);
    } catch (err) { setError("Eroare la date: " + err.message); }
    finally { setLoading(false); }
  };
  const handleEdit = async () => {
    try {
      await axios.put(`${API}/users/${editUser.id}?token=${token}&role=${editRole}&department_id=${editDept}`);
      setSuccess("User actualizat"); setEditUser(null); fetchData(); setTimeout(() => setSuccess(""), 3000);
    } catch { setError("Eroare la actualizare"); }
  };
  const toggleStatus = async (id, isActive) => {
    if (isActive && !window.confirm("Dezactivezi acest user?")) return;
    try {
      if (isActive) await axios.delete(`${API}/users/${id}?token=${token}`);
      else await axios.put(`${API}/users/${id}/reactivate?token=${token}`);
      fetchData();
    } catch { setError("Eroare la schimbare status"); }
  };
  const handleAddUser = async () => {
    setError("");
    try {
      await axios.post(`${API}/auth/register`, { ...newUser, department_id: newUser.department_id ? parseInt(newUser.department_id) : null }, { headers: { "Content-Type": "application/json" } });
      setSuccess("User adăugat"); setShowAddModal(false); setNewUser({ full_name: "", email: "", password: "", role: "student", department_id: "" }); fetchData(); setTimeout(() => setSuccess(""), 3000);
    } catch (err) { setError(err.response?.data?.detail || "Eroare la adăugare"); }
  };

  const roleBadge = (role) => {
    const map = { admin: "bg-rose-50 text-rose-700 border-rose-200", manager: "bg-amber-50 text-amber-800 border-amber-200", student: "bg-blue-50 text-blue-700 border-blue-200" };
    const label = { admin: "Admin", manager: "Manager", student: "Cursant" };
    return <span className={`tag ${map[role]}`}>{label[role] || role}</span>;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Se încarcă...</div>;

  return (
    <div className="min-h-screen pb-12">
      <div className="bg-white border-b px-6 py-9" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="eyebrow">Acces & control</span>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Utilizatori</h1>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">+ Adaugă utilizator</button>
        </div>
      </div>

      <div className="px-6 max-w-6xl mx-auto space-y-4 mt-8">
        {success && <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">{success}</div>}
        {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">{error}</div>}

        <div className="surface overflow-hidden">
          <div className="px-6 py-5 border-b flex items-center justify-between" style={{ borderColor: "var(--line)" }}>
            <h2 className="text-lg font-bold text-slate-900">Membrii platformei</h2>
            <span className="text-xs font-semibold text-slate-400">{users.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data">
              <thead><tr><th>Utilizator</th><th>Rol</th><th>Departament</th><th style={{ textAlign: "center" }}>Status</th><th style={{ textAlign: "right" }}>Acțiuni</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={!u.is_active ? { opacity: .55 } : undefined}>
                    <td><p className="font-semibold text-slate-900">{u.full_name}</p><p className="text-xs text-slate-400">{u.email}</p></td>
                    <td>{roleBadge(u.role)}</td>
                    <td className="text-slate-600">{departments.find((d) => d.id === u.department_id)?.name || "—"}</td>
                    <td style={{ textAlign: "center" }}><span className={`tag ${u.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>{u.is_active ? "Activ" : "Inactiv"}</span></td>
                    <td style={{ textAlign: "right" }}>
                      <div className="flex justify-end gap-3">
                        <button onClick={() => { setEditUser(u); setEditRole(u.role); setEditDept(u.department_id || ""); }} className="text-sm font-semibold" style={{ color: "var(--accent)" }}>Editează</button>
                        <button onClick={() => toggleStatus(u.id, u.is_active)} className={`text-sm font-semibold ${u.is_active ? "text-rose-600" : "text-emerald-600"}`}>{u.is_active ? "Dezactivează" : "Reactivează"}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,22,34,.45)" }}>
          <div className="surface w-full max-w-md p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Utilizator nou</h3>
            <div className="space-y-4">
              <input className="input" placeholder="Nume complet" value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} />
              <input className="input" type="email" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
              <input className="input" type="password" placeholder="Parolă temporară" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <select className="input" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                  <option value="student">Cursant</option><option value="manager">Manager</option><option value="admin">Admin</option>
                </select>
                <select className="input" value={newUser.department_id} onChange={(e) => setNewUser({ ...newUser, department_id: e.target.value })}>
                  <option value="">Fără dept.</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={handleAddUser} className="btn btn-primary flex-1">Crează</button>
              <button onClick={() => setShowAddModal(false)} className="btn btn-ghost flex-1">Anulează</button>
            </div>
          </div>
        </div>
      )}

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,22,34,.45)" }}>
          <div className="surface w-full max-w-md p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Editează permisiuni</h3>
            <p className="text-sm text-slate-500 mb-6">{editUser.full_name}</p>
            <div className="space-y-4">
              <select className="input" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                <option value="student">Cursant</option><option value="manager">Manager</option><option value="admin">Admin</option>
              </select>
              <select className="input" value={editDept} onChange={(e) => setEditDept(e.target.value)}>
                <option value="">Fără departament</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={handleEdit} className="btn btn-primary flex-1">Salvează</button>
              <button onClick={() => setEditUser(null)} className="btn btn-ghost flex-1">Anulează</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}