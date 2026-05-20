import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isAdmin = user?.role === "admin";
  const isStudent = user?.role === "student";

  const adminLinks = [
    { path: "/admin/dashboard", label: "Dashboard" },
    { path: "/admin/cursuri", label: "Cursuri" },
    { path: "/admin/useri", label: "Utilizatori" },
    { path: "/admin/settings", label: "Setări" },
  ];

  const studentLinks = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/my-profile", label: "Profilul Meu" },
    { path: "/my-exams", label: "Examene" },
  ];

  const navLinks = isAdmin ? adminLinks : isStudent ? studentLinks : [];

  return (
    <nav className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(isAdmin ? "/admin/dashboard" : "/dashboard")}>
            <div className="text-2xl font-bold">🎓</div>
            <span className="text-xl font-bold">AI eLearning</span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex gap-8">
            {navLinks.map((link) => (
              <a
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`cursor-pointer transition-colors duration-200 ${
                  location.pathname === link.path
                    ? "text-yellow-300 font-semibold border-b-2 border-yellow-300 pb-1"
                    : "hover:text-gray-200"
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4 relative">
            <div className="text-sm">
              <p className="font-semibold">{user?.full_name || user?.email}</p>
              <p className="text-xs text-gray-300 capitalize">{user?.role}</p>
            </div>

            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center font-bold text-gray-900 hover:shadow-lg transition"
            >
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white text-gray-900 rounded-lg shadow-lg top-14">
                <button
                  onClick={() => {
                    navigate("/my-profile");
                    setDropdownOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100 first:rounded-t-lg"
                >
                  📋 Profil
                </button>
                <button
                  onClick={() => {
                    navigate("/my-profile");
                    setDropdownOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  ⚙️ Setări
                </button>
                <button
                  onClick={() => {
                    handleLogout();
                    setDropdownOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100 last:rounded-b-lg text-red-600 font-semibold"
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
