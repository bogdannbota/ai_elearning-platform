import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const dropdownRef = useRef(null);

  // Închide dropdown la click în afară
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Închide mobile menu la schimbare de rută
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isAdmin   = user?.role === "admin";
  const isManager = user?.role === "manager";
  const isStudent = user?.role === "student";

const adminLinks = [
  { path: "/admin/dashboard",  label: "Dashboard",    icon: "🏠" },
  { path: "/admin/cursuri",    label: "Cursuri",      icon: "📚" },
  { path: "/admin/examene",    label: "Examene",      icon: "📝" },
  { path: "/admin/learning-plans", label: "Planuri", icon: "🗺️" },
  { path: "/admin/useri",      label: "Utilizatori",  icon: "👥" },
  { path: "/admin/settings",   label: "Setări",       icon: "⚙️" },
];

  const managerLinks = [
    { path: "/manager/dashboard", label: "Dashboard",  icon: "🏠" },
    { path: "/admin/cursuri",     label: "Cursuri",    icon: "📚" },
    { path: "/admin/learning-plans", label: "Planuri", icon: "🗺️" },
    { path: "/admin/examene",     label: "Examene",    icon: "📝" },
  ];

  const studentLinks = [
    { path: "/student/dashboard", label: "Dashboard",  icon: "🏠" },
    { path: "/cursuri",           label: "Cursuri",    icon: "📚" },
    { path: "/my-exams",          label: "Examene",    icon: "📝" },
  ];

  const navLinks = isAdmin ? adminLinks : isManager ? managerLinks : studentLinks;

  const homeRoute = isAdmin ? "/admin/dashboard" : isManager ? "/manager/dashboard" : "/student/dashboard";

  // Inițiale avatar
  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const roleLabel = {
    admin:   "Administrator",
    manager: "Profesor",
    student: "Student",
  }[user?.role] || user?.role;

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm shadow-gray-100/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <button
            onClick={() => navigate(homeRoute)}
            className="flex items-center gap-2.5 hover:opacity-80 transition group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-amber-400 flex items-center justify-center text-sm font-bold text-white shadow-md shadow-cyan-100 group-hover:scale-105 transition-transform">
              🎓
            </div>
            <span className="text-gray-900 font-extrabold text-lg tracking-tight hidden sm:block">
              AI eLearning
            </span>
          </button>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  isActive(link.path)
                    ? "bg-cyan-50 text-cyan-700"
                    : "text-gray-500 hover:text-cyan-600 hover:bg-gray-50"
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">

            {/* User dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-100 transition-all shadow-sm"
              >
                {/* Info utilizator */}
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-extrabold text-gray-900 leading-none">
                    {user?.full_name?.split(" ")[0] || "Utilizator"}
                  </p>
                  <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider leading-none mt-1">{roleLabel}</p>
                </div>

                {/* Avatar */}
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-400 flex items-center justify-center text-xs font-black text-white flex-shrink-0 shadow-sm shadow-cyan-200">
                  {initials}
                </div>

                {/* Chevron */}
                <span className={`text-gray-400 text-xs transition-transform ${dropdownOpen ? "rotate-180" : ""}`}>
                  ▾
                </span>
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">

                  {/* Header */}
                  <div className="px-5 py-3 border-b border-gray-50 mb-1 bg-gray-50/50">
                    <p className="text-sm font-extrabold text-gray-900 truncate">{user?.full_name}</p>
                    <p className="text-xs text-gray-500 truncate font-medium mt-0.5">{user?.email}</p>
                  </div>

                  {/* Items */}
                  {[
                    { label: "Profilul meu", icon: "👤", path: "/my-profile" },
                    { label: "Dashboard",    icon: "🏠", path: homeRoute },
                  ].map(({ label, icon, path }) => (
                    <button
                      key={path}
                      onClick={() => { navigate(path); setDropdownOpen(false); }}
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-cyan-50 hover:text-cyan-700 transition text-left"
                    >
                      <span className="text-base">{icon}</span>
                      {label}
                    </button>
                  ))}

                  <div className="border-t border-gray-50 mt-1 pt-1">
                    <button
                      onClick={() => { handleLogout(); setDropdownOpen(false); }}
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition text-left"
                    >
                      <span className="text-base">🚪</span>
                      Deconectare
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-600 hover:text-cyan-600 transition border border-gray-100"
            >
              {mobileOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 space-y-1 bg-white animate-in slide-in-from-top-2">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all font-bold ${
                  isActive(link.path)
                    ? "bg-cyan-50 text-cyan-700"
                    : "text-gray-500 hover:bg-gray-50 hover:text-cyan-600"
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </button>
            ))}
            <div className="border-t border-gray-100 mt-2 pt-2">
              <button
                onClick={() => navigate("/my-profile")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 hover:text-cyan-600 transition"
              >
                <span>👤</span> Profil
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition"
              >
                <span>🚪</span> Deconectare
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}