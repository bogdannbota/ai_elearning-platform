import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { addToast } = { addToast: () => {} }; // fallback dacă nu folosești toast aici

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
    { path: "/admin/dashboard", label: "Dashboard",    icon: "🏠" },
    { path: "/admin/cursuri",   label: "Cursuri",      icon: "📚" },
    { path: "/admin/useri",     label: "Utilizatori",  icon: "👥" },
    { path: "/admin/settings",  label: "Setări",       icon: "⚙️" },
  ];

  const managerLinks = [
    { path: "/manager/dashboard", label: "Dashboard",  icon: "🏠" },
    { path: "/cursuri",           label: "Cursuri",    icon: "📚" },
    { path: "/my-exams",          label: "Examene",    icon: "📝" },
  ];

  const studentLinks = [
    { path: "/student/dashboard", label: "Dashboard",  icon: "🏠" },
    { path: "/cursuri",           label: "Cursuri",    icon: "📚" },
    { path: "/my-exams",          label: "Examene",    icon: "📝" },
  ];

  const navLinks = isAdmin
    ? adminLinks
    : isManager
    ? managerLinks
    : studentLinks;

  const homeRoute = isAdmin
    ? "/admin/dashboard"
    : isManager
    ? "/manager/dashboard"
    : "/student/dashboard";

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
    <nav className="bg-gray-900 border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <button
            onClick={() => navigate(homeRoute)}
            className="flex items-center gap-2.5 hover:opacity-80 transition"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold text-white">
              🎓
            </div>
            <span className="text-white font-semibold text-base hidden sm:block">
              AI eLearning
            </span>
          </button>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  isActive(link.path)
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
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
                className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition"
              >
                {/* Info utiliaztor */}
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold text-white leading-none">
                    {user?.full_name?.split(" ")[0] || "Utilizator"}
                  </p>
                  <p className="text-xs text-gray-500 leading-none mt-0.5">{roleLabel}</p>
                </div>

                {/* Avatar */}
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {initials}
                </div>

                {/* Chevron */}
                <span className={`text-gray-500 text-xs transition-transform ${dropdownOpen ? "rotate-180" : ""}`}>
                  ▾
                </span>
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-gray-800 border border-white/10 rounded-2xl shadow-xl overflow-hidden py-1">

                  {/* Header */}
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-sm font-semibold text-white truncate">{user?.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>

                  {/* Items */}
                  {[
                    { label: "Profilul meu", icon: "👤", path: "/my-profile" },
                    {
                      label: "Dashboard",
                      icon: "🏠",
                      path: homeRoute,
                    },
                  ].map(({ label, icon, path }) => (
                    <button
                      key={path}
                      onClick={() => { navigate(path); setDropdownOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition text-left"
                    >
                      <span className="text-base">{icon}</span>
                      {label}
                    </button>
                  ))}

                  <div className="border-t border-white/10 mt-1 pt-1">
                    <button
                      onClick={() => { handleLogout(); setDropdownOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition text-left"
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
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition border border-white/10"
            >
              {mobileOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/10 py-3 space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition ${
                  isActive(link.path)
                    ? "bg-white/10 text-white font-medium"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </button>
            ))}
            <div className="border-t border-white/10 mt-2 pt-2">
              <button
                onClick={() => navigate("/my-profile")}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-white/5 hover:text-white transition"
              >
                <span>👤</span> Profil
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition"
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
