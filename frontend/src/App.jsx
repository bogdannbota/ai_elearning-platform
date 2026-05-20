import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import PrivateRoute from "./components/PrivateRoute";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/admin/Dashboard";
import Cursuri from "./pages/admin/Cursuri";
import Useri from "./pages/admin/Useri";
import Settings from "./pages/admin/Settings";
import StudentDashboard from "./pages/student/Dashboard";
import Quiz from "./pages/student/quiz";
import Profile from "./pages/Profile";
import CourseDetails from "./pages/CourseDetails";
import Exams from "./pages/Exams";

function AppContent() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/*"
          element={
            <>
              <Navbar />
              <Routes>
                <Route path="/admin/dashboard" element={
                  <PrivateRoute allowedRoles={["admin"]}><AdminDashboard /></PrivateRoute>
                } />
                <Route path="/admin/cursuri" element={
                  <PrivateRoute allowedRoles={["admin"]}><Cursuri /></PrivateRoute>
                } />
                <Route path="/admin/useri" element={
                  <PrivateRoute allowedRoles={["admin"]}><Useri /></PrivateRoute>
                } />
                <Route path="/admin/settings" element={
                  <PrivateRoute allowedRoles={["admin"]}><Settings /></PrivateRoute>
                } />
                <Route path="/dashboard" element={
                  <PrivateRoute allowedRoles={["student", "manager"]}><StudentDashboard /></PrivateRoute>
                } />
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
                <Route path="*" element={<Navigate to="/dashboard" />} />
              </Routes>
            </>
          }
        />
      </Routes>
    </>
  );
}

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