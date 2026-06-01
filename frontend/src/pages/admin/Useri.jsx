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
  
  // Modals state
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
      setSuccess("Utilizator actualizat cu succes."); setEditUser(null); fetchData(); setTimeout(() => setSuccess(""), 3000);
    } catch { setError("Eroare la actualizare"); }
  };

  const toggleStatus = async (id, isActive) => {
    if (isActive && !window.confirm("Ești sigur că vrei să dezactivezi acest utilizator?")) return;
    try {
      if (isActive) await axios.delete(`${API}/users/${id}?token=${token}`);
      else await axios.put(`${API}/users/${id}/reactivate?token=${token}`);
      fetchData();
    } catch { setError("Eroare la schimbarea statusului"); }
  };

  const handleAddUser = async () => {
    setError("");
    try {
      await axios.post(`${API}/auth/register`, { ...newUser, department_id: newUser.department_id ? parseInt(newUser.department_id) : null }, { headers: { "Content-Type": "application/json" } });
      setSuccess("Utilizator adăugat cu succes."); setShowAddModal(false); setNewUser({ full_name: "", email: "", password: "", role: "student", department_id: "" }); fetchData(); setTimeout(() => setSuccess(""), 3000);
    } catch (err) { setError(err.response?.data?.detail || "Eroare la adăugare"); }
  };

  const roleBadge = (role) => {
    const map = { admin: "bg-rose-50 text-rose-700 border-rose-200", manager: "bg-amber-50 text-amber-800 border-amber-200", student: "bg-blue-50 text-blue-700 border-blue-200" };
    const label = { admin: "Admin", manager: "Manager", student: "Cursant" };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${map[role]}`}>{label[role] || role}</span>;
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const groupedUsers = departments.map(dept => ({
    id: dept.id,
    name: dept.name,
    users: users.filter(u => u.department_id === dept.id)
  })).filter(dept => dept.users.length > 0);

  const unassignedUsers = users.filter(u => !u.department_id || !departments.some(d => d.id === u.department_id));
  if (unassignedUsers.length > 0) {
    groupedUsers.push({ id: 'unassigned', name: 'Fără departament', users: unassignedUsers });
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">Se încarcă datele...</div>;

  return (
    <div className="min-h-screen pb-16 bg-slate-50/50">
      <div className="bg-white border-b px-6 py-8 shadow-sm" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Acces & control</span>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Utilizatori</h1>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary shadow-sm hover:shadow-md transition-all flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Adaugă utilizator
          </button>
        </div>
      </div>

      <div className="px-6 max-w-6xl mx-auto space-y-8 mt-8">
        {success && <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
          {success}
        </div>}
        {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
          {error}
        </div>}

        {groupedUsers.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-dashed" style={{ borderColor: "var(--line)" }}>
            Nu există utilizatori înregistrați momentan.
          </div>
        ) : (
          groupedUsers.map((group) => (
            <div key={group.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: "var(--line)" }}>
              <div className="bg-slate-50/80 px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">{group.name}</h2>
                  <span className="bg-white text-slate-500 text-xs font-bold px-3 py-1 rounded-full border shadow-sm" style={{ borderColor: "var(--line)" }}>
                    {group.users.length} {group.users.length === 1 ? 'membru' : 'membri'}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white text-slate-400 text-xs uppercase tracking-wider border-b" style={{ borderColor: "var(--line)" }}>
                      <th className="px-6 py-3 font-semibold">Utilizator</th>
                      <th className="px-6 py-3 font-semibold">Rol</th>
                      <th className="px-6 py-3 font-semibold text-center">Status</th>
                      <th className="px-6 py-3 font-semibold text-right">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                    {group.users.map((u) => (
                      <tr key={u.id} className={`hover:bg-slate-50/50 transition-colors ${!u.is_active ? "opacity-60 bg-slate-50" : ""}`}>
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold border border-slate-300">
                            {getInitials(u.full_name)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{u.full_name}</p>
                            <p className="text-sm text-slate-500">{u.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {roleBadge(u.role)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            u.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}>
                            {u.is_active ? "Activ" : "Inactiv"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {/* Edit Icon */}
                            <button 
                              onClick={() => { setEditUser(u); setEditRole(u.role); setEditDept(u.department_id || ""); }} 
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editează utilizatorul"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                            </button>

                            {/* Deactivate/Reactivate Icon */}
                            <button 
                              onClick={() => toggleStatus(u.id, u.is_active)} 
                              className={`p-2 rounded-lg transition-colors ${u.is_active ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"}`}
                              title={u.is_active ? "Dezactivează utilizatorul" : "Reactivează utilizatorul"}
                            >
                              {u.is_active ? (
                                // Trash icon
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              ) : (
                                // Refresh / Activate icon
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Adăugare Utilizator */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: "rgba(15,22,34,.6)" }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 border" style={{ borderColor: "var(--line)" }}>
            <h3 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              Adaugă utilizator nou
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nume complet</label>
                <input className="input w-full bg-slate-50 border-slate-200" placeholder="Ex: Ion Popescu" value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                <input className="input w-full bg-slate-50 border-slate-200" type="email" placeholder="ion@exemplu.ro" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Parolă temporară</label>
                <input className="input w-full bg-slate-50 border-slate-200" type="password" placeholder="••••••••" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Rol</label>
                  <select className="input w-full bg-slate-50 border-slate-200" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                    <option value="student">Cursant</option><option value="manager">Manager</option><option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Departament</label>
                  <select className="input w-full bg-slate-50 border-slate-200" value={newUser.department_id} onChange={(e) => setNewUser({ ...newUser, department_id: e.target.value })}>
                    <option value="">Fără departament</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={handleAddUser} className="btn btn-primary flex-1 py-2.5">Creează Contul</button>
              <button onClick={() => setShowAddModal(false)} className="btn btn-ghost flex-1 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent">Anulează</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editare Utilizator */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: "rgba(15,22,34,.6)" }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 border" style={{ borderColor: "var(--line)" }}>
            <h3 className="text-xl font-extrabold text-slate-900 mb-1">Editează permisiuni</h3>
            <p className="text-sm font-medium text-slate-500 mb-6 pb-4 border-b" style={{ borderColor: "var(--line)" }}>Modifici accesul pentru <span className="text-slate-800">{editUser.full_name}</span></p>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Rol utilizator</label>
                <select className="input w-full bg-slate-50 border-slate-200" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                  <option value="student">Cursant</option><option value="manager">Manager</option><option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Departament atribuit</label>
                <select className="input w-full bg-slate-50 border-slate-200" value={editDept} onChange={(e) => setEditDept(e.target.value)}>
                  <option value="">Fără departament</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={handleEdit} className="btn btn-primary flex-1 py-2.5">Salvează</button>
              <button onClick={() => setEditUser(null)} className="btn btn-ghost flex-1 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent">Anulează</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}