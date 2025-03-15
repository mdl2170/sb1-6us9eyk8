import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { TaskManagement } from './pages/TaskManagement';
import { Reports } from './pages/Reports';
import { Profile } from './pages/Profile';
import { UserManagement } from './pages/UserManagement';
import { StudentManagement } from './pages/StudentManagement';
import { ToastContainer } from './components/ToastContainer';
import { JobSearch } from './pages/JobSearch';
import { PerformanceReview } from './pages/PerformanceReview';

function App() {
  return (
    <AuthProvider>
      <ToastContainer />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/task" element={<TaskManagement />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/students" element={<StudentManagement />} />
          <Route path="/job-search" element={<JobSearch />} />
          <Route path="/performance" element={<PerformanceReview />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;