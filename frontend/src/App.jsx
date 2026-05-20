import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import PrivateRoute from "./components/PrivateRoute";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/admin/Dashboard";
import CursuriAdmin from "./pages/admin/Cursuri";
import Useri from "./pages/admin/Useri";
import Settings from "./pages/admin/Settings";
import StudentDashboard from "./pages/student/Dashboard";
import ManagerDashboard from "./pages/manager/Dashboard";
import Quiz from "./pages/student/quiz";
import Profile from "./pages/Profile";
import CourseDetails from "./pages/CourseDetails";
import Exams from "./pages/Exams";
import Cursuri from "./pages/Cursuri";

// ─── Component care redirectează /dashboard pe baza rolului ───
function DashboardRedirect() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (user.role === "admin")   return <Navigate to="/admin/dashboard" replace />;
  if (user.role === "manager") return <Navigate to="/manager/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
}

// ─── AppContent ───────────────────────────────────────────────
function AppContent() {
  return (
    <Routes>
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/*"
        element={
          <>
            <Navbar />
            <Routes>
              {/* Redirect inteligent pe rol */}
              <Route path="/dashboard" element={<DashboardRedirect />} />

              {/* Admin */}
              <Route path="/admin/dashboard" element={
                <PrivateRoute allowedRoles={["admin"]}><AdminDashboard /></PrivateRoute>
              } />
            <Route path="/admin/cursuri" element={
  <PrivateRoute allowedRoles={["admin"]}><CursuriAdmin /></PrivateRoute>
} />
              <Route path="/admin/useri" element={
                <PrivateRoute allowedRoles={["admin"]}><Useri /></PrivateRoute>
              } />
              <Route path="/admin/settings" element={
                <PrivateRoute allowedRoles={["admin"]}><Settings /></PrivateRoute>
              } />

              {/* Manager / Profesor */}
              <Route path="/manager/dashboard" element={
                <PrivateRoute allowedRoles={["manager"]}><ManagerDashboard /></PrivateRoute>
              } />

              {/* Student */}
              <Route path="/student/dashboard" element={
                <PrivateRoute allowedRoles={["student"]}><StudentDashboard /></PrivateRoute>
              } />
              <Route path="/cursuri" element={
                <PrivateRoute allowedRoles={["student", "manager", "admin"]}>
                  <Cursuri />
                        </PrivateRoute>
              } />

              {/* Comune */}
              <Route path="/my-profile" element={
                <PrivateRoute allowedRoles={["student", "manager", "admin"]}><Profile /></PrivateRoute>
              } />
              <Route path="/course/:courseId" element={
                <PrivateRoute allowedRoles={["student", "manager"]}><CourseDetails /></PrivateRoute>
              } />
              <Route path="/my-exams" element={
                <PrivateRoute allowedRoles={["student", "manager"]}><Exams /></PrivateRoute>
              } />
              <Route path="/quiz/:courseId" element={
                <PrivateRoute allowedRoles={["student", "manager"]}><Quiz /></PrivateRoute>
              } />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </>
        }
      />
    </Routes>
  );
}

// ─── App root ─────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
