import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import axios from "axios";

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
        axios.get(`http://127.0.0.1:8000/users/?token=${token}`),
        axios.get(`http://127.0.0.1:8000/departments/?token=${token}`),
      ]);
      setUsers(u.data); setDepartments(d.data);
    } catch (err) { setError("Eroare la date: " + err.message); } finally { setLoading(false); }
  };

  const handleEdit = async () => {
    try {
      await axios.put(`http://127.0.0.1:8000/users/${editUser.id}?token=${token}&role=${editRole}&department_id=${editDept}`);
      setSuccess("User actualizat!"); setEditUser(null); fetchData(); setTimeout(() => setSuccess(""), 3000);
    } catch (err) { setError("Eroare la actualizare"); }
  };

  const toggleStatus = async (id, isActive) => {
    if (isActive && !window.confirm("Dezactivezi acest user?")) return;
    try {
      if (isActive) await axios.delete(`http://127.0.0.1:8000/users/${id}?token=${token}`);
      else await axios.put(`http://127.0.0.1:8000/users/${id}/reactivate?token=${token}`);
      fetchData();
    } catch { setError("Eroare la schimbare status"); }
  };

  const handleAddUser = async () => {
    setError("");
    try {
      await axios.post(`http://127.0.0.1:8000/auth/register`, { ...newUser, department_id: newUser.department_id ? parseInt(newUser.department_id) : null }, { headers: { "Content-Type": "application/json" } });
      setSuccess("User adăugat!"); setShowAddModal(false); setNewUser({ full_name: "", email: "", password: "", role: "student", department_id: "" }); fetchData(); setTimeout(() => setSuccess(""), 3000);
    } catch (err) { setError(err.response?.data?.detail || "Eroare la adăugare"); }
  };

  const getRoleBadge = (role) => {
    const map = { admin: "bg-red-50 text-red-700 border-red-200", manager: "bg-amber-50 text-amber-700 border-amber-200", student: "bg-cyan-50 text-cyan-700 border-cyan-200" };
    return <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${map[role]}`}>{role}</span>;
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-cyan-200 border-t-cyan-500 rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-12 animate-in fade-in duration-500">
      
      <div className="bg-white border-b border-gray-100 px-6 py-10 relative overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/50 to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <p className="text-xs font-bold text-cyan-600 uppercase tracking-widest mb-1">Acces & Control</p>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Management Useri</h1>
          </div>
          <button onClick={() => setShowAddModal(true)} className="px-6 py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-extrabold rounded-xl transition-all shadow-md shadow-gray-900/10 flex items-center gap-2">
            <span className="text-lg">+</span> Adaugă User Nou
          </button>
        </div>
      </div>

      <div className="px-6 max-w-6xl mx-auto space-y-6">
        {success && <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2"><span>✓</span> {success}</div>}
        {error && <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2"><span>⚠️</span> {error}</div>}

        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-gray-900">Membrii Platformei</h2>
            <span className="bg-white border border-gray-200 text-gray-600 font-bold px-3 py-1 rounded-lg text-xs shadow-sm">{users.length} Total</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase tracking-wider bg-white border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-bold">Nume Utilizator</th>
                  <th className="px-6 py-4 font-bold">Rol</th>
                  <th className="px-6 py-4 font-bold">Departament</th>
                  <th className="px-6 py-4 font-bold text-center">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u.id} className={`hover:bg-cyan-50/30 transition-colors ${!u.is_active ? "opacity-60" : ""}`}>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{u.full_name}</p>
                      <p className="text-xs font-medium text-gray-500 mt-0.5">{u.email}</p>
                    </td>
                    <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{departments.find((d) => d.id === u.department_id)?.name || "—"}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${u.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{u.is_active ? "Activ" : "Inactiv"}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => { setEditUser(u); setEditRole(u.role); setEditDept(u.department_id || ""); }} className="text-cyan-600 hover:text-cyan-800 font-bold text-xs transition-colors">Editează</button>
                        <button onClick={() => toggleStatus(u.id, u.is_active)} className={`${u.is_active ? "text-red-500 hover:text-red-700" : "text-green-600 hover:text-green-800"} font-bold text-xs transition-colors`}>
                          {u.is_active ? "Dezactivează" : "Reactivează"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Add */}
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md animate-in zoom-in-95">
              <h3 className="text-2xl font-extrabold text-gray-900 mb-6 border-b border-gray-100 pb-4">Înregistrare User</h3>
              <div className="space-y-4">
                <input type="text" placeholder="Nume Complet" value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:border-cyan-400" />
                <input type="email" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:border-cyan-400" />
                <input type="password" placeholder="Parolă temporară" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:border-cyan-400" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-cyan-400 text-gray-700">
                    <option value="student">Student</option>
                    <option value="manager">Manager / Prof</option>
                    <option value="admin">Administrator</option>
                  </select>
                  <select value={newUser.department_id} onChange={(e) => setNewUser({ ...newUser, department_id: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-cyan-400 text-gray-700">
                    <option value="">Fără Dept.</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={handleAddUser} className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-extrabold py-3.5 rounded-xl shadow-md shadow-cyan-500/20 transition-all">Crează</button>
                <button onClick={() => setShowAddModal(false)} className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-extrabold py-3.5 rounded-xl transition-all">Anulează</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Edit */}
        {editUser && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md animate-in zoom-in-95">
              <h3 className="text-xl font-extrabold text-gray-900 mb-6 border-b border-gray-100 pb-4">Editează Permisiuni</h3>
              <p className="text-sm font-bold text-gray-500 mb-4">{editUser.full_name}</p>
              <div className="space-y-4">
                <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:border-cyan-400">
                  <option value="student">Student</option>
                  <option value="manager">Manager / Prof</option>
                  <option value="admin">Administrator</option>
                </select>
                <select value={editDept} onChange={(e) => setEditDept(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:border-cyan-400">
                  <option value="">Fără departament asignat</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={handleEdit} className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-extrabold py-3.5 rounded-xl shadow-md transition-all">Salvează</button>
                <button onClick={() => setEditUser(null)} className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-extrabold py-3.5 rounded-xl transition-all">Anulează</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}