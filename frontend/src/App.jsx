import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/admin/Dashboard";
import Cursuri from "./pages/admin/Cursuri";
import Useri from "./pages/admin/Useri";
import StudentDashboard from "./pages/student/Dashboard";
import Quiz from "./pages/student/quiz";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/dashboard" element={
            <PrivateRoute allowedRoles={["admin"]}><AdminDashboard /></PrivateRoute>
          } />
          <Route path="/admin/cursuri" element={
            <PrivateRoute allowedRoles={["admin"]}><Cursuri /></PrivateRoute>
          } />
          <Route path="/admin/useri" element={
            <PrivateRoute allowedRoles={["admin"]}><Useri /></PrivateRoute>
          } />
          <Route path="/dashboard" element={
            <PrivateRoute allowedRoles={["student", "manager"]}><StudentDashboard /></PrivateRoute>
          } />
          <Route path="/quiz/:courseId" element={
            <PrivateRoute allowedRoles={["student", "manager"]}><Quiz /></PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}