import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";

import PrivateRoute from "./components/PrivateRoute";
import Navbar from "./components/Navbar";
import AiAssistant from "./components/AiAssistant";
import Footer from "./components/Footer";

// PAGES
import Login from "./pages/Login";
import Register from "./pages/Register";

import AdminDashboard from "./pages/admin/Dashboard";
import CursuriAdmin from "./pages/admin/Cursuri";
import Useri from "./pages/admin/Useri";
import Settings from "./pages/admin/Settings";
import Examene from "./pages/admin/Examene";
import ExamEditor from "./pages/admin/ExamEditor";
import LearningPlans from "./pages/admin/LearningPlans";

import StudentDashboard from "./pages/student/Dashboard";
import ManagerDashboard from "./pages/manager/Dashboard";

import Quiz from "./pages/student/Quiz";
import Profile from "./pages/Profile";
import CourseDetails from "./pages/CourseDetails";
import Exams from "./pages/Exams";
import Cursuri from "./pages/Cursuri";
import TakeExam from "./pages/student/TakeExam";
import MyLearningPlans from "./pages/student/MyLearningPlans";



// ─────────────────────────────
// Redirect pe rol
// ─────────────────────────────
function DashboardRedirect() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (user.role === "admin")
    return <Navigate to="/admin/dashboard" replace />;

  if (user.role === "manager")
    return <Navigate to="/manager/dashboard" replace />;

  return <Navigate to="/student/dashboard" replace />;
}

// ─────────────────────────────
// App Content (routing principal)
// ─────────────────────────────
function AppContent() {
  return (
    <>
      <Navbar />

      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Redirect */}
        <Route path="/dashboard" element={<DashboardRedirect />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* ADMIN */}
        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/cursuri"
          element={
            <PrivateRoute allowedRoles={["admin", "manager"]}>
              <CursuriAdmin />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/useri"
          element={
            <PrivateRoute allowedRoles={["admin"]}>
              <Useri />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/settings"
          element={
            <PrivateRoute allowedRoles={["admin"]}>
              <Settings />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/examene"
          element={
            <PrivateRoute allowedRoles={["admin", "manager"]}>
              <Examene />
            </PrivateRoute>
          }
        />
        <Route
  path="/admin/learning-plans"
  element={
    <PrivateRoute allowedRoles={["admin", "manager"]}>
      <LearningPlans />
    </PrivateRoute>
  }
/>

        <Route
          path="/admin/examene/:examId/editor"
          element={
            <PrivateRoute allowedRoles={["admin", "manager"]}>
              <ExamEditor />
            </PrivateRoute>
          }
        />

        {/* MANAGER */}
        <Route
          path="/manager/dashboard"
          element={
            <PrivateRoute allowedRoles={["manager"]}>
              <ManagerDashboard />
            </PrivateRoute>
          }
        />

        {/* STUDENT */}
        <Route
          path="/student/dashboard"
          element={
            <PrivateRoute allowedRoles={["student"]}>
              <StudentDashboard />
            </PrivateRoute>
          }
        />
        <Route
  path="/exams/:examId/take"
  element={
    <PrivateRoute allowedRoles={["student", "manager", "admin"]}>
      <TakeExam />
    </PrivateRoute>
  }
/>

        {/* COMMON */}
        <Route
          path="/cursuri"
          element={
            <PrivateRoute allowedRoles={["student", "manager", "admin"]}>
              <Cursuri />
            </PrivateRoute>
          }
        />

        <Route
          path="/my-profile"
          element={
            <PrivateRoute allowedRoles={["student", "manager", "admin"]}>
              <Profile />
            </PrivateRoute>
          }
        />

        <Route
          path="/course/:courseId"
          element={
            <PrivateRoute allowedRoles={["student", "manager"]}>
              <CourseDetails />
            </PrivateRoute>
          }
        />

        <Route
          path="/my-exams"
          element={
            <PrivateRoute allowedRoles={["student", "manager"]}>
              <Exams />
            </PrivateRoute>
          }
        />

        <Route
          path="/quiz/:courseId"
          element={
            <PrivateRoute allowedRoles={["student", "manager"]}>
              <Quiz />
            </PrivateRoute>
          }
          
        />
        <Route
  path="/my-learning-plans"
  element={
    <PrivateRoute allowedRoles={["student"]}>
      <MyLearningPlans />
    </PrivateRoute>
  }
/>

        {/* fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Footer />
    </>
  );
}

// ─────────────────────────────
// ROOT APP (SINGURUL EXPORT DEFAULT)
// ─────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
          <AiAssistant />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}