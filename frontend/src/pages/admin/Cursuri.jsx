import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

export default function Cursuri() {
  const { token } = useAuth();
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
    <div className="min-h-screen bg-gray-50 pb-12 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-10 relative overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/50 to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          <p className="text-xs font-bold text-cyan-600 uppercase tracking-widest mb-1">Panou de Control</p>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Gestionare Cursuri</h1>
        </div>
      </div>

      <div className="px-6 max-w-6xl mx-auto space-y-6">
        {success && <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2"><span>✓</span> {success}</div>}
        {error && <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2"><span>⚠️</span> {error}</div>}

        {/* Modal editare departament */}
        {editCourse && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in-95">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Asignează departament</h3>
              <p className="text-sm text-gray-500 mb-4 truncate">Curs: {editCourse.title}</p>
              <select
                value={editDeptId}
                onChange={(e) => setDeptId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 transition-all mb-5"
              >
                <option value="">Selectează departament</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <div className="flex gap-3">
                <button onClick={handleAssignDept} className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-cyan-500/20">Salvează</button>
                <button onClick={() => setEditCourse(null)} className="flex-1 bg-white border border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition-all">Anulează</button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formular Creare curs */}
          <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 lg:col-span-1 h-fit">
            <h2 className="text-lg font-extrabold text-gray-900 mb-5">Creare Curs Nou</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Titlu Curs</label>
                <input
                  type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Descriere</label>
                <textarea
                  value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 transition-all resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Departament</label>
                <select
                  value={deptId} onChange={(e) => setDeptId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 transition-all"
                >
                  <option value="">Selectează departament</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              {/* Upload PDF */}
              <div className="border-2 border-dashed border-gray-200 bg-gray-50 rounded-xl p-5 text-center hover:border-cyan-400 hover:bg-cyan-50/30 transition-all cursor-pointer group">
                <input id="fileInput" type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} className="hidden" />
                <label htmlFor="fileInput" className="cursor-pointer block">
                  {file ? (
                    <div className="flex flex-col items-center gap-1 text-cyan-700">
                      <span className="text-2xl mb-1">📄</span>
                      <span className="font-bold text-sm truncate max-w-full px-2">{file.name}</span>
                      <span className="text-gray-500 text-xs font-semibold">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                  ) : (
                    <div className="text-gray-500 group-hover:text-cyan-600 transition-colors">
                      <p className="text-2xl mb-2">📁</p>
                      <p className="text-sm font-semibold">Încarcă un PDF de suport</p>
                      <p className="text-xs text-gray-400 mt-1">(Opțional)</p>
                    </div>
                  )}
                </label>
              </div>

              <button type="submit" className="w-full bg-gray-900 hover:bg-gray-800 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-md shadow-gray-900/10 mt-2">
                Adaugă Cursul
              </button>
            </form>
          </div>

          {/* Lista cursuri */}
          <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden lg:col-span-2">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-extrabold text-gray-900">Catalogul de Cursuri</h2>
            </div>
            
            {courses.length === 0 ? (
              <p className="text-gray-500 text-center py-12 font-medium">Nu există cursuri adăugate încă.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase tracking-wider bg-white border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 font-bold">Informații Curs</th>
                      <th className="px-6 py-4 font-bold">Departament</th>
                      <th className="px-6 py-4 font-bold text-center">Atașament</th>
                      <th className="px-6 py-4 font-bold text-right">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {courses.map((c) => (
                      <tr key={c.id} className="hover:bg-cyan-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900">{c.title}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[200px] mt-0.5">{c.description || "Fără descriere"}</p>
                        </td>
                        <td className="px-6 py-4">
                          {c.department_name ? (
                            <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-bold">{c.department_name}</span>
                          ) : (
                            <span className="text-gray-400 text-xs font-medium italic">Neasignat</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {c.file_path ? (
                            <a href={`http://127.0.0.1:8000/${c.file_path}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors">
                              📄 PDF
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-3">
                            <button onClick={() => { setEditCourse(c); setEditDeptId(c.department_id || ""); }} className="text-cyan-600 hover:text-cyan-800 font-bold text-xs transition-colors">
                              Setează Dept.
                            </button>
                            <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 font-bold text-xs transition-colors">
                              Șterge
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}