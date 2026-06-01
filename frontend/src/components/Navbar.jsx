import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { deptTheme } from "../theme/departments";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  if (!user) return null;

  const handleLogout = () => { logout(); navigate("/login"); };

  const isAdmin = user.role === "admin";
  const isManager = user.role === "manager";

  const adminLinks = [
    { path: "/admin/dashboard", label: "Dashboard" },
    { path: "/admin/cursuri", label: "Cursuri" },
    { path: "/admin/examene", label: "Examene" },
    { path: "/admin/learning-plans", label: "Planuri" },
    { path: "/admin/useri", label: "Utilizatori" },
    { path: "/admin/settings", label: "Setări" },
  ];
  const managerLinks = [
    { path: "/manager/dashboard", label: "Dashboard" },
    { path: "/admin/cursuri", label: "Cursuri" },
    { path: "/admin/learning-plans", label: "Planuri" },
    { path: "/admin/examene", label: "Examene" },
  ];
  const studentLinks = [
    { path: "/student/dashboard", label: "Dashboard" },
    { path: "/cursuri", label: "Cursuri" },
    { path: "/my-exams", label: "Examene" },
    { path: "/my-learning-plans", label: "Planurile mele" },
  ];
  const navLinks = isAdmin ? adminLinks : isManager ? managerLinks : studentLinks;
  const homeRoute = isAdmin ? "/admin/dashboard" : isManager ? "/manager/dashboard" : "/student/dashboard";

  const initials = user.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "U";
  const roleLabel = { admin: "Administrator", manager: "Manager departament", student: "Cursant" }[user.role] || user.role;
  const dept = deptTheme(user.department_id);
  const deptName = user.department?.name;
  const isActive = (p) => location.pathname === p;

  return (
    <nav className="sticky top-0 z-50 bg-white border-b" style={{ borderColor: "var(--line)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button onClick={() => navigate(homeRoute)} className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold"
                 style={{ background: "var(--ink)", fontFamily: "var(--font-display)" }}>
              L
            </div>
            <div className="hidden sm:block text-left leading-none">
              <span className="block font-bold text-[15px]" style={{ fontFamily: "var(--font-display)" }}>LearnHub</span>
              <span className="block text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--ink-soft)" }}>Enterprise</span>
            </div>
          </button>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button key={link.path} onClick={() => navigate(link.path)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isActive(link.path) ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"}`}
                style={{ fontFamily: "var(--font-display)" }}>
                {link.label}
              </button>
            ))}
          </div>

          {/* User */}
          <div className="flex items-center gap-3">
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-xl bg-white hover:bg-slate-50 border transition"
                style={{ borderColor: "var(--line)" }}>
                <div className="text-right hidden sm:block leading-tight">
                  <p className="text-xs font-bold text-slate-900">{user.full_name?.split(" ")[0]}</p>
                  {deptName && (
                    <span className={`tag ${dept.chip} mt-0.5`} style={{ padding: "0 .4rem" }}>{deptName}</span>
                  )}
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                     style={{ background: "var(--ink)" }}>{initials}</div>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 surface overflow-hidden py-2">
                  <div className="px-4 py-3 border-b" style={{ borderColor: "var(--line)" }}>
                    <p className="text-sm font-bold text-slate-900 truncate">{user.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    <p className="text-[11px] font-semibold mt-1" style={{ color: "var(--accent)" }}>{roleLabel}</p>
                  </div>
                  {[{ label: "Profilul meu", path: "/my-profile" }, { label: "Dashboard", path: homeRoute }].map((it) => (
                    <button key={it.path} onClick={() => { navigate(it.path); setDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                      {it.label}
                    </button>
                  ))}
                  <div className="border-t mt-1 pt-1" style={{ borderColor: "var(--line)" }}>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                      Deconectare
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg border text-slate-600"
              style={{ borderColor: "var(--line)" }}>
              {mobileOpen ? "✕" : "≡"}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t py-3 space-y-1" style={{ borderColor: "var(--line)" }}>
            {navLinks.map((link) => (
              <button key={link.path} onClick={() => navigate(link.path)}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold ${
                  isActive(link.path) ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"}`}>
                {link.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}