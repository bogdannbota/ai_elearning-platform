import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

export default function Cursuri() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deptId, setDeptId] = useState("");
  const [file, setFile] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [editCourse, setEditCourse] = useState(null);
  const [editDeptId, setEditDeptId] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [c, d] = await Promise.all([
      axios.get(`http://127.0.0.1:8000/courses/?token=${token}`),
      axios.get(`http://127.0.0.1:8000/departments/?token=${token}`),
    ]);
    setCourses(c.data);
    setDepartments(d.data);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    try {
      const formData = new FormData();
      if (file) formData.append("file", file);
      await axios.post(
        `http://127.0.0.1:8000/courses/?token=${token}&title=${encodeURIComponent(title)}&description=${encodeURIComponent(description || "")}&department_ids=${deptId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setSuccess("Cursul a fost creat cu succes!");
      setTitle(""); setDescription(""); setDeptId(""); setFile(null);
      document.getElementById("fileInput").value = "";
      fetchData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Eroare la crearea cursului");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Ești sigur că vrei să ștergi acest curs?")) return;
    await axios.delete(`http://127.0.0.1:8000/courses/${id}?token=${token}`);
    fetchData();
  };

  const handleAssignDept = async () => {
    if (!editDeptId) return;
    try {
      await axios.post(
        `http://127.0.0.1:8000/courses/assign-department?token=${token}&course_id=${editCourse.id}&department_id=${editDeptId}`
      );
      setSuccess("Departamentul a fost asignat!");
      setEditCourse(null);
      fetchData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Eroare la asignare");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-900 text-white px-6 py-4 flex justify-between items-center shadow">
        <h1 className="text-xl font-bold">AI eLearning — Admin</h1>
        <div className="flex gap-4 items-center">
          <button onClick={() => navigate("/admin/dashboard")} className="text-blue-200 hover:text-white text-sm">Dashboard</button>
          <button onClick={() => navigate("/admin/useri")} className="text-blue-200 hover:text-white text-sm">Useri</button>
          <button onClick={() => navigate("/admin/cursuri")} className="text-white font-semibold text-sm">Cursuri</button>
          <button onClick={() => { logout(); navigate("/login"); }} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm">Deconectare</button>
        </div>
      </nav>

      <div className="p-6 max-w-5xl mx-auto">
        {success && <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm mb-4">{success}</div>}
        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}

        {/* Modal editare departament */}
        {editCourse && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">Asignează departament: {editCourse.title}</h3>
              <select
                value={editDeptId}
                onChange={(e) => setEditDeptId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              >
                <option value="">Selectează departament</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <div className="flex gap-3">
                <button onClick={handleAssignDept} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg">Salvează</button>
                <button onClick={() => setEditCourse(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-6 py-2 rounded-lg">Anulează</button>
              </div>
            </div>
          </div>
        )}

        {/* Creare curs */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Creare Curs Nou</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <input
              type="text"
              placeholder="Titlu curs"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <textarea
              placeholder="Descriere curs"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <select
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selectează departament</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {/* Upload PDF */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition">
              <input
                id="fileInput"
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden"
              />
              <label htmlFor="fileInput" className="cursor-pointer">
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <span>📄</span>
                    <span className="font-medium">{file.name}</span>
                    <span className="text-gray-400 text-xs">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                ) : (
                  <div className="text-gray-400">
                    <p className="text-2xl mb-1">📁</p>
                    <p className="text-sm">Click pentru a încărca un PDF <span className="text-blue-500">(opțional)</span></p>
                  </div>
                )}
              </label>
            </div>

            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition">
              Crează Curs
            </button>
          </form>
        </div>

        {/* Lista cursuri */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Cursuri Existente</h2>
          {courses.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Nu există cursuri încă.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-left px-4 py-3">Titlu</th>
                  <th className="text-left px-4 py-3">Descriere</th>
                  <th className="text-left px-4 py-3">Departament</th>
                  <th className="text-left px-4 py-3">PDF</th>
                  <th className="text-left px-4 py-3">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{c.title}</td>
                    <td className="px-4 py-3 text-gray-500">{c.description || "—"}</td>
                    <td className="px-4 py-3">
                      {c.department_name ? (
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">{c.department_name}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Neasignat</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.file_path ? (
                        <a
                          href={`http://127.0.0.1:8000/${c.file_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-500 hover:text-red-700 text-xs font-medium flex items-center gap-1"
                        >
                          📄 Vezi PDF
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">Fără PDF</span>
                      )}
                    </td>
                    <td className="px-4 py-3 flex gap-3">
                      <button
                        onClick={() => { setEditCourse(c); setEditDeptId(c.department_id || ""); }}
                        className="text-blue-500 hover:text-blue-700 text-xs font-medium"
                      >
                        Asignează dept.
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        Șterge
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}