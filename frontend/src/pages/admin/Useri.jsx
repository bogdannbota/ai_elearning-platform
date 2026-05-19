import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

export default function Useri() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
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
      setUsers(u.data);
      setDepartments(d.data);
    } catch (err) {
      setError("Eroare la încărcarea datelor: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    try {
      await axios.put(`http://127.0.0.1:8000/users/${editUser.id}?token=${token}&role=${editRole}&department_id=${editDept}`);
      setSuccess("Userul a fost actualizat!");
      setEditUser(null);
      fetchData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Eroare la actualizare: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm("Dezactivezi acest user?")) return;
    try {
      await axios.delete(`http://127.0.0.1:8000/users/${id}?token=${token}`);
      fetchData();
    } catch (err) {
      setError("Eroare la dezactivare: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleReactivate = async (id) => {
    try {
      await axios.put(`http://127.0.0.1:8000/users/${id}/reactivate?token=${token}`);
      fetchData();
    } catch (err) {
      setError("Eroare la reactivare: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleAddUser = async () => {
    setError("");
    try {
      await axios.post(
        `http://127.0.0.1:8000/auth/register`,
        {
          full_name: newUser.full_name,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role,
          department_id: newUser.department_id ? parseInt(newUser.department_id) : null,
        },
        { headers: { "Content-Type": "application/json" } }
      );
      setSuccess("Userul a fost adăugat cu succes!");
      setShowAddModal(false);
      setNewUser({ full_name: "", email: "", password: "", role: "student", department_id: "" });
      fetchData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Eroare la adăugare user");
    }
  };

  const getRoleBadge = (role) => {
    const colors = { admin: "bg-red-100 text-red-700", manager: "bg-yellow-100 text-yellow-700", student: "bg-green-100 text-green-700" };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[role] || ""}`}>{role}</span>;
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <p className="text-gray-500 text-lg">Se încarcă...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-900 text-white px-6 py-4 flex justify-between items-center shadow">
        <h1 className="text-xl font-bold">AI eLearning — Admin</h1>
        <div className="flex gap-4 items-center">
          <button onClick={() => navigate("/admin/dashboard")} className="text-blue-200 hover:text-white text-sm">Dashboard</button>
          <button onClick={() => navigate("/admin/useri")} className="text-white font-semibold text-sm">Useri</button>
          <button onClick={() => navigate("/admin/cursuri")} className="text-blue-200 hover:text-white text-sm">Cursuri</button>
          <button onClick={() => { logout(); navigate("/login"); }} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm">Deconectare</button>
        </div>
      </nav>

      <div className="p-6 max-w-6xl mx-auto">
        {success && <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm mb-4">{success}</div>}
        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}

        {/* Modal Adăugare User */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">Adaugă User Nou</h3>
              <div className="space-y-3">
                <input type="text" placeholder="Nume complet" value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="email" placeholder="Email" value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="password" placeholder="Parolă" value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="student">Student</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
                <select value={newUser.department_id} onChange={(e) => setNewUser({ ...newUser, department_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selectează departament</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={handleAddUser} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg">Adaugă</button>
                <button onClick={() => setShowAddModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-6 py-2 rounded-lg">Anulează</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Editare User */}
        {editUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">Editează: {editUser.full_name}</h3>
              <div className="space-y-3">
                <select value={editRole} onChange={(e) => setEditRole(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="student">Student</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
                <select value={editDept} onChange={(e) => setEditDept(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Fără departament</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg">Salvează</button>
                <button onClick={() => setEditUser(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-6 py-2 rounded-lg">Anulează</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Gestionare Useri</h2>
          <button onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg transition">
            + Adaugă User
          </button>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="text-left px-4 py-3">Nume</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Rol</th>
                <th className="text-left px-4 py-3">Departament</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{u.full_name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">{getRoleBadge(u.role)}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {departments.find((d) => d.id === u.department_id)?.name || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {u.is_active ? "Activ" : "Inactiv"}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-3">
                    <button onClick={() => { setEditUser(u); setEditRole(u.role); setEditDept(u.department_id || ""); }}
                      className="text-blue-500 hover:text-blue-700 text-xs font-medium">
                      Editează
                    </button>
                    {u.is_active ? (
                      <button onClick={() => handleDeactivate(u.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium">
                        Dezactivează
                      </button>
                    ) : (
                      <button onClick={() => handleReactivate(u.id)}
                        className="text-green-500 hover:text-green-700 text-xs font-medium">
                        Reactivează
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}